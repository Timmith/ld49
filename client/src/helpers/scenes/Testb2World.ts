import { Body, kinematicBody, LinearStiffness, MouseJoint, MouseJointDef, Vec2, World } from "box2d";
import {
	BufferGeometry,
	Camera,
	Color,
	Fog,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	WebGLRenderer
} from "three";
import device from "~/device";
import getKeyboardInput from "~/input/getKeyboardInput";
import { Box2DPreviewMesh, debugPolygonPhysics } from "~/meshes/Box2DPreviewMesh";
import BaseContactListener from "~/physics/contact listeners/BaseContactListener";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { getBodyMeshEventManager } from "~/physics/managers/bodyMeshEventManager";
import { processDestructions, queueDestruction } from "~/physics/managers/destructionManager";
import { processHUD } from "~/physics/managers/hudManager";
import {
	ArchitectParams,
	convertTob2Space,
	createArchitectMeshAndFixtures,
	createImprovedPhysicsCircle,
	createSensorBox,
	createStaticBox,
	isArchitectParams,
	makeBitMask,
	PBits,
	queryForSingleArchitectureBody
} from "~/physics/utils/physicsUtils";
import { loadLevelDataFromLocalStorage, saveLevelDataToLocalStorage } from "~/physics/utils/serialUtils";
import { __INITIAL_LEVEL_DURATION, __LEVEL_DURATION_INCREMENT } from "~/settings/constants";
import SimpleGUIOverlay, { ButtonUserData } from "~/ui/SimpleGUIOverlay";
import { COLOR_HOURGLASS_AVAILABLE, COLOR_HOURGLASS_UNAVAILABLE } from "~/utils/colorLibrary";
import { KeyboardCodes } from "~/utils/KeyboardCodes";
import { getUrlColor, getUrlFlag } from "~/utils/location";
import { RayCastConverter } from "~/utils/RayCastConverter";
import { taskTimer, TimedTask } from "~/utils/taskTimer";

import { startControls } from "../../controllers/startControls";
import { getMetaContactListener } from "../../physics/utils/contactListenerUtils";
import { getArchitecturePiece } from "../architectureLibrary";
import Player from "../Player";
import { GameState, Piece } from "../types";

const FOV = 35;
const MOBILE_FOV = 28;

let isKeyQDown: boolean = false;
let isKeyZDown: boolean = false;
let isKeyVDown: boolean = false;

const emptyUpdate = (dt: number) => {};
const FIXED_PHYSICS_DT = 1 / 120;

export default class Testb2World {
	get state(): GameState {
		return this._state;
	}
	set state(value: GameState) {
		if (this.state !== value) {
			console.log(value);
			this._state = value;
			switch (value) {
				case "waitingForInput":
					this.interactive = true;
					break;
				case "playing":
					this.interactive = true;
					break;
				case "gameOver":
					this.colorizeHourglassButton(COLOR_HOURGLASS_UNAVAILABLE);
					console.log("Sorry, you lost!");

					this.failedPieces.length = 0;

					this.activeArchitectureBodies.forEach(body => {
						const fixt = body.GetFixtureList();
						if (fixt) {
							queueDestruction(fixt.GetBody());
						}
					});
					this.activeArchitectureBodies.length = 0;

					this.delayedGameEvent(() => {
						this.changeLevel(0);
						this.spawn5Pieces();
						this.player.currentHealth = 5;
						this.state = "waitingForInput";
					}, 2);
					break;
				case "settling":
					this.interactive = false;
					this.turnGravityOn();
					this.colorizeHourglassButton(COLOR_HOURGLASS_UNAVAILABLE);
					this.delayedGameEvent(() => {
						this.state = "checking";
					}, 5);
					break;
				case "checking":
					let contact = this.goalLine.m_contactList;
					let won = false;
					while (contact) {
						if (contact.contact.IsTouching()) {
							won = true;
							break;
						}
						contact = contact.next;
					}

					if (this.player.currentHealth === 0) {
						won = false;
					}

					if (won) {
						this.activeArchitectureBodies.forEach(body => {
							let fixt = body.GetFixtureList();
							const categoryArray: PBits[] = ["environment"];
							const userData = body.GetUserData() as ArchitectParams;
							userData.categoryArray = categoryArray;
							const bitMask = makeBitMask(categoryArray);
							while (fixt) {
								fixt.m_filter.categoryBits = bitMask;
								fixt = fixt.m_next;
							}
						});

						console.log("Congrats, you passed the level!");
						this.changeLevel(this.player.currentLevel + 1);

						this.delayedGameEvent(() => {
							this.spawn5Pieces();

							this.state = "waitingForInput";
						}, 2);

						this.state = "transitioning";
					} else {
						this.state = "gameOver";
					}
					break;
				default:
				//debugger
			}
			this.stateUpdate = this.stateUpdates[value];
		}
	}
	get lastSelectedBody(): Body | undefined {
		return this._lastSelectedBody;
	}
	set lastSelectedBody(value: Body | undefined) {
		this._lastSelectedBody = value;
		if (this.pieceSelectedCallback) {
			this.pieceSelectedCallback(value);
		}
	}
	get interactive(): boolean {
		return this._interactive;
	}
	set interactive(value: boolean) {
		this._interactive = value;
		if (!value) {
			this.detachCursorJoint();
		}
	}

	stateUpdate: (dt: number) => void;

	stateUpdates: { [K in GameState]: (dt: number) => void } = {
		uninitialized: emptyUpdate,

		waitingForInput: (dt: number) => {
			if (this.player.currentHealth === 0) {
				this.state = "gameOver";
			}
		},

		playing: (dt: number) => {
			this.player.currentTimer -= dt;

			// Responsible for level end & checking, settling, gameOver
			if (this.player.currentTimer < 0) {
				this.player.currentTimer = 0;
				this.state = "settling";
			} else if (this.player.currentHealth === 0) {
				this.state = "gameOver";
			}
		},

		settling: emptyUpdate,

		checking: emptyUpdate,

		transitioning: emptyUpdate,

		gameOver: emptyUpdate
	};

	pieceSpawnPoints5: Vec2[] = [
		new Vec2(-1.55, -0.35),
		new Vec2(-0.95, 0.65),
		new Vec2(0.0, 1.0),
		new Vec2(0.95, 0.65),
		new Vec2(1.55, -0.35)
	];

	pieceSpawnPoints9: Vec2[] = [
		new Vec2(-1.55, -0.35),
		new Vec2(-1.35, 0.3),
		new Vec2(-0.95, 0.65),
		new Vec2(-0.45, 0.85),
		new Vec2(0.0, 1.0),
		new Vec2(0.45, 0.85),
		new Vec2(0.95, 0.65),
		new Vec2(1.35, 0.3),
		new Vec2(1.55, -0.35)
	];
	currentLevelWinCondition: boolean | undefined;
	autoClear = true;
	gui = new SimpleGUIOverlay();

	protected scene: Scene;
	protected camera: Camera;
	protected bgColor: Color;
	protected b2Preview: Box2DPreviewMesh;

	private debugMode: boolean = getUrlFlag("debugMode");
	private failedPieces: Body[] = [];

	private player = new Player();
	private cursorPosition: Vec2;
	private playerCursorBody: Body;
	private cursorJoint: MouseJoint | undefined;

	private activeArchitectureBodies: Body[] = [];

	private penaltyLine: Body;
	private goalLine: Body;

	private hourglassButton: Mesh<BufferGeometry, MeshBasicMaterial> | undefined;
	private timedTasks: TimedTask[] = [];
	private _interactive: boolean;
	private _lastSelectedBody: Body | undefined;

	private _state: GameState = "uninitialized";

	private b2World: World;

	private _postUpdates: Array<(dt: number) => void> = [];

	constructor(
		private rayCastConverter?: RayCastConverter,
		private levelChangeCallback?: (level: number) => void,
		private pieceSelectedCallback?: (body?: Body) => void
	) {
		this.initiateScene();

		const b2World = new World(new Vec2(0, 0));
		b2World.SetGravity(new Vec2(0, -9.8));

		getBodyEventManager().init(b2World);
		getBodyMeshEventManager().init(b2World);

		// if (getUrlParam("test") === "b2Preview") {
		const b2Preview = new Box2DPreviewMesh(b2World);
		this.b2Preview = b2Preview;
		if (this.b2Preview && !rayCastConverter) {
			this.rayCastConverter = convertTob2Space.bind(null, this.b2Preview);
		}
		this.scene.add(this.b2Preview);
		debugPolygonPhysics.value = true;
		// }
		this.b2World = b2World;

		/* Using the MetaContactListener, via either initializing one or regrabbing it from reference,
		register any ContactListeners for separate contact cases */
		const mcl = getMetaContactListener();
		const bcl = new BaseContactListener();
		bcl.listenForHealthChanges((healthDelta: number, body: Body) => {
			if (!this.failedPieces.includes(body)) {
				this.failedPieces.push(body);
				this.player.currentHealth = Math.max(0, this.player.currentHealth + healthDelta);
			}
		});
		mcl.register(bcl);
		this.b2World.SetContactListener(mcl);

		/* The Be All And End All Keyboard Listener (a.k.a. THE BUTTON FUNNELER) */
		getKeyboardInput().addListener(this.HandleKey);

		/* Character Spawn/Control */

		const initControls = async () => {
			const controls = await startControls(
				this.b2World,
				rayCastConverter!,
				this.gui,
				this.b2Preview,
				this.player
			);
			this._postUpdates.push(controls.postUpdate);

			this.playerCursorBody = createImprovedPhysicsCircle(
				this.b2World,
				0,
				0,
				0.05,
				undefined,
				undefined,
				undefined,
				true,
				undefined,
				undefined,
				kinematicBody
			);

			this.hourglassButton = controls.ui.hourglassButton;
			const buttonUserData = controls.ui.hourglassButton.userData;
			if (buttonUserData instanceof ButtonUserData) {
				buttonUserData.registerHitCallback(() => {
					if (this.state === "playing") {
						this.player.currentTimer = 0;
					}
				});
			}
		};
		initControls();

		/* Test Environment */

		createStaticBox(this.b2World, 0, -1, 2, 0.1);
		createStaticBox(this.b2World, -1, -0.9, 0.2, 0.1);
		createStaticBox(this.b2World, 1, -0.9, 0.2, 0.1);

		this.penaltyLine = createSensorBox(this.b2World, 0, -1.5, 10, 0.1, ["penalty"], ["architecture"]);
		this.goalLine = createSensorBox(this.b2World, 0, -0.25, 10, 0.1, ["goal"], ["architecture", "environment"]);

		this.pieceSpawnPoints5.forEach(vec2 => {
			const { meshName, colliderName } = getArchitecturePiece();
			createArchitectMeshAndFixtures({
				floating: true,
				x: vec2.x,
				y: vec2.y,
				angle: 0,
				meshName,
				colliderName,
				categoryArray: ["architecture"],
				maskArray: ["penalty", "environment", "architecture", "goal"]
			}).then(this.onNewPiece);
		});

		function getFirstTouch(touchEvent: TouchEvent) {
			return touchEvent.touches.item(0)!;
		}

		const onDebugMouseDown = (mouseClick: MouseEvent) => {
			onCursorStart(mouseClick.clientX, mouseClick.clientY);
		};
		const onDebugTouchStart = (touchEvent: TouchEvent) => {
			const touch = getFirstTouch(touchEvent);
			onCursorStart(touch.clientX, touch.clientY);
		};
		const onCursorStart = (x: number, y: number) => {
			const buttonHit = this.gui.rayCastForButton(x, y);

			if (!buttonHit) {
				if (this.state === "waitingForInput") {
					this.state = "playing";

					this.colorizeHourglassButton(COLOR_HOURGLASS_AVAILABLE);
				}
				this.cursorPosition = this.rayCastConverter!(x, y);
				const clickedb2Space: Vec2 = this.rayCastConverter!(x, y);

				if (this.interactive) {
					const body = queryForSingleArchitectureBody(b2World, clickedb2Space);

					if (body) {
						this.attachCursorJoint(clickedb2Space, body);
					}
				}

				if (this.debugMode) {
					if (isKeyQDown) {
						const { meshName, colliderName } = getArchitecturePiece();
						createArchitectMeshAndFixtures({
							floating: true,
							x: clickedb2Space.x,
							y: clickedb2Space.y,
							angle: 0,
							meshName,
							colliderName,
							categoryArray: ["architecture"],
							maskArray: ["penalty", "environment", "architecture", "goal"]
						}).then(this.onNewPiece);
					}
					if (isKeyZDown) {
						const circleBody = createImprovedPhysicsCircle(
							b2World,
							clickedb2Space.x,
							clickedb2Space.y,
							0.2,
							["architecture"],
							["penalty", "environment", "architecture", "goal"],
							this.player
						);
						this.activeArchitectureBodies.push(circleBody);
					}
					if (isKeyVDown) {
						//
					}
				}

				/* CONSOLE LOG to notify of click in client space versus game space */
				// console.log(` Client Space				VS		Game Space
				// 		 X: ${mouseClick.clientX}			X: ${clickedb2Space.x}
				// 		 Y: ${mouseClick.clientY}			Y: ${clickedb2Space.y}`);
			}
		};

		const onDebugMouseUp = (mouseUp: MouseEvent) => {
			onCursorStop();
		};
		const onDebugTouchEnd = (touchEvent: TouchEvent) => {
			onCursorStop();
		};
		const onCursorStop = () => {
			this.detachCursorJoint();
		};

		const onDebugMouseMove = (mouseMove: MouseEvent) => {
			onCursorMove(mouseMove.clientX, mouseMove.clientY);
		};

		const onDebugTouchMove = (touchEvent: TouchEvent) => {
			const touch = getFirstTouch(touchEvent);
			onCursorMove(touch.clientX, touch.clientY);
		};

		const onCursorMove = (x: number, y: number) => {
			this.cursorPosition = this.rayCastConverter!(x, y);
			if (this.playerCursorBody) {
				this.playerCursorBody.SetPosition(this.cursorPosition);
				if (this.cursorJoint) {
					this.cursorJoint.SetTarget(this.cursorPosition);
				}
			}
		};

		document.addEventListener("mousedown", onDebugMouseDown, false);
		document.addEventListener("mouseup", onDebugMouseUp, false);
		document.addEventListener("mousemove", onDebugMouseMove, false);
		document.addEventListener("touchstart", onDebugTouchStart, false);
		document.addEventListener("touchend", onDebugTouchEnd, false);
		document.addEventListener("touchmove", onDebugTouchMove, false);

		getKeyboardInput().addListener(async (key, down) => {
			if (down) {
				if (key === "F5") {
					saveLevelDataToLocalStorage(this.state, this.player, this.b2World);
				} else if (key === "F9") {
					this.activeArchitectureBodies.forEach(queueDestruction);
					this.activeArchitectureBodies.length = 0;

					const data = await loadLevelDataFromLocalStorage(this.player, this.onNewPiece);
					if (data) {
						this.state = data.gameState;
						this.changeLevel(data.player.currentLevel, false);
					}
					this.clearDelayedGameEvents();
				}
			}
		});
		this.state = "waitingForInput";
	} //+++++++++++++++++++++++++++END OF CONSTRUCTOR CURLY BRACKET++++++++++++++++++++++++++++++++//
	delayedGameEvent(cb: () => void, delay: number) {
		this.timedTasks.push(taskTimer.add(cb, delay));
	}
	clearDelayedGameEvents() {
		for (const timedTask of this.timedTasks) {
			taskTimer.cancel(timedTask);
		}
		this.timedTasks.length = 0;
	}
	spawn5Pieces() {
		this.pieceSpawnPoints5.forEach(vec2 => {
			const { meshName, colliderName } = getArchitecturePiece();
			createArchitectMeshAndFixtures({
				floating: true,
				x: vec2.x,
				y: vec2.y + this.player.currentLevel,
				angle: 0,
				meshName,
				// "collider" + randInt(3, 1),
				colliderName,
				categoryArray: ["architecture"],
				maskArray: ["penalty", "environment", "architecture", "goal"]
			}).then(this.onNewPiece);
		});
	}
	changeLevel(level: number, resetPlayerData = true) {
		this.player.currentLevel = level;
		this.b2Preview.offset.y = level;

		this.goalLine.SetPosition(new Vec2(0, -0.25 + level));
		this.penaltyLine.SetPosition(new Vec2(0, -1.5 + level));

		if (resetPlayerData) {
			this.player.maxTimer = __INITIAL_LEVEL_DURATION + level * __LEVEL_DURATION_INCREMENT;
			this.player.currentTimer = this.player.maxTimer;
		}

		if (this.levelChangeCallback) {
			this.levelChangeCallback(level);
		}
	}
	onNewPiece = (piece: Piece) => {
		this.activeArchitectureBodies.push(piece.body);
		this.togglePieceFloat(piece.body);
	};

	HandleKey(code: KeyboardCodes, down: boolean) {
		switch (code) {
			case "KeyQ":
				isKeyQDown = down;
				break;
			case "KeyZ":
				isKeyZDown = down;
				break;
			case "KeyV":
				isKeyVDown = down;
				break;
			default:
				//console.log(code);
				break;
		}
	}

	update(dt: number) {
		this.scene.updateMatrixWorld(false);
		const targetPhysicsTime = this.player.physicsTime + dt;

		while (this.player.physicsTime < targetPhysicsTime) {
			this.player.physicsTime += FIXED_PHYSICS_DT;
			this.b2World.Step(FIXED_PHYSICS_DT, 5, 2);
		}

		for (const pu of this._postUpdates) {
			pu(dt);
		}
		if (this.b2Preview) {
			this.b2Preview.update(dt);
		}

		processDestructions();
		processHUD(dt, this.player);
		this.stateUpdate(dt);
	}

	render(renderer: WebGLRenderer, dt: number) {
		if (this.autoClear) {
			renderer.setClearColor(this.bgColor, 1);
			renderer.clear(true, true, true);
		}
		renderer.render(this.scene, this.camera);
		this.gui.render(renderer);
	}

	private detachCursorJoint() {
		if (this.cursorJoint) {
			this.b2World.DestroyJoint(this.cursorJoint);
			this.cursorJoint = undefined;
		}
	}

	private attachCursorJoint(clickedb2Space: Vec2, body: Body) {
		const frequencyHz = 5.0;
		const dampingRatio = 0.7;
		const jointDef: MouseJointDef = new MouseJointDef();
		jointDef.bodyA = this.playerCursorBody;
		jointDef.bodyB = body;
		jointDef.target.Copy(clickedb2Space);
		jointDef.maxForce = 20 * body.GetMass();
		LinearStiffness(jointDef, frequencyHz, dampingRatio, jointDef.bodyA, jointDef.bodyB);
		this.cursorJoint = this.b2World.CreateJoint(jointDef);
		body.SetAwake(true);
	}

	private colorizeHourglassButton(color: Color) {
		if (this.hourglassButton) {
			this.hourglassButton.material.color.copy(color);
		}
	}

	private turnGravityOn() {
		this.activeArchitectureBodies.forEach(body => {
			this.togglePieceFloat(body, false);
		});
	}

	private togglePieceFloat(body: Body, shouldFloat?: boolean) {
		const userData = body.GetUserData();
		if (isArchitectParams(userData)) {
			if (shouldFloat === undefined) {
				shouldFloat = userData.floating;
			} else {
				userData.floating = shouldFloat;
			}
		}
		body.SetGravityScale(shouldFloat ? 0 : 1);
		body.SetLinearDamping(shouldFloat ? 5 : 0);
		body.SetAngularDamping(shouldFloat ? 5 : 0);
		if (!shouldFloat) {
			body.SetAwake(true);
		}
	}

	private initiateScene() {
		const scene = new Scene();
		const bgColor: Color = getUrlColor("bgColor", new Color(0x231f20)); //soft dark grey background
		//const bgColor: Color = getUrlColor("bgColor", new Color(0x000000)); //black background
		scene.fog = new Fog(bgColor.getHex(), 0, 160);
		scene.autoUpdate = false;
		scene.matrixAutoUpdate = false;
		const camera = new PerspectiveCamera(device.isMobile ? MOBILE_FOV : FOV, device.aspect, 0.1, 100);
		device.onChange(() => {
			camera.fov = device.isMobile ? MOBILE_FOV : FOV;
			camera.aspect = device.aspect;
			camera.updateProjectionMatrix();
		}, true);
		camera.position.set(0, 0, 0);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();
		scene.add(camera);
		this.scene = scene;
		this.camera = camera;
		this.bgColor = bgColor;
	}
}
