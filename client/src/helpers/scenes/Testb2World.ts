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
	convertTob2Space,
	createArchitectMeshAndFixtures,
	createImprovedPhysicsCircle,
	createSensorBox,
	createStaticBox,
	makeBitMask,
	queryForSingleArchitectureBody
} from "~/physics/utils/physicsUtils";
import { loadLevelDataFromLocalStorage, saveLevelDataToLocalStorage } from "~/physics/utils/serialUtils";
import { __INITIAL_LEVEL_DURATION, __LEVEL_DURATION_INCREMENT } from "~/settings/constants";
import SimpleGUIOverlay, { ButtonUserData } from "~/ui/SimpleGUIOverlay";
import { COLOR_HOURGLASS_AVAILABLE, COLOR_HOURGLASS_UNAVAILABLE } from "~/utils/colorLibrary";
import { KeyboardCodes } from "~/utils/KeyboardCodes";
import { getUrlColor, getUrlFlag } from "~/utils/location";
import { RayCastConverter } from "~/utils/RayCastConverter";
import { taskTimer } from "~/utils/taskTimer";

import { startControls } from "../../controllers/startControls";
import { getMetaContactListener } from "../../physics/utils/contactListenerUtils";
import { getArchitecturePiece } from "../architectureLibrary";
import Player from "../Player";

const FOV = 35;
const MOBILE_FOV = 28;

let isKeyQDown: boolean = false;
let isKeyZDown: boolean = false;
let isKeyXDown: boolean = false;
let isKeyCDown: boolean = false;
let isKeyVDown: boolean = false;

const emptyUpdate = (dt: number) => {};

export type GameState =
	| "uninitialized"
	| "waitingForInput"
	| "playing"
	| "settling"
	| "checking"
	| "transitioning"
	| "gameOver";

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
				case "gameOver":
					this.colorizeHourglassButton(COLOR_HOURGLASS_UNAVAILABLE);
					console.log("Sorry, you lost!");
					this.failedPieces.length = 0;
					this.player.currentLevel = 0;
					this.b2Preview.offset.y = this.player.currentLevel;

					if (this.gameResetCallback) {
						this.gameResetCallback();
					}

					this.activeArchitectureBodies.forEach(body => {
						const fixt = body.GetFixtureList();
						if (fixt) {
							queueDestruction(fixt.GetBody());
						}
					});
					this.activeArchitectureBodies.length = 0;

					this.turnGravityOff(this.b2World, this.applyCurrentAtmosphericDamping);
					taskTimer.add(() => {
						this.pieceSpawnPoints5.forEach(vec2 => {
							const { meshName, colliderName } = getArchitecturePiece();
							createArchitectMeshAndFixtures({
								x: vec2.x,
								y: vec2.y + this.b2Preview.offset.y,
								angle: 0,
								meshName,
								// "collider" + randInt(3, 1),
								colliderName,
								categoryArray: ["architecture"],
								maskArray: ["penalty", "environment", "architecture", "goal"]
							}).then(pillar => {
								this.applyCurrentAtmosphericDamping(pillar.body);
								this.activeArchitectureBodies.push(pillar.body);
							});
						});
						this.goalLine.SetPosition(new Vec2(0, -0.25 + 1 * this.player.currentLevel));
						this.penaltyLine.SetPosition(new Vec2(0, -1.5 + 1 * this.player.currentLevel));
						this.player.currentTimer = 20 + this.player.currentLevel * 10;
						this.player.maxTimer = 20 + this.player.currentLevel * 10;
						this.player.currentHealth = 5;
						this.state = "waitingForInput";
					}, 2);
					break;
				case "settling":
					this.interactive = false;
					this.turnGravityOn(this.b2World, this.applyCurrentAtmosphericDamping);
					this.colorizeHourglassButton(COLOR_HOURGLASS_UNAVAILABLE);
					taskTimer.add(() => {
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
							while (fixt) {
								const bitMask = makeBitMask(["environment"]);
								fixt.m_filter.categoryBits = bitMask;
								fixt = fixt.m_next;
							}
						});

						console.log("Congrats, you passed the level!");
						if (this.nextLevelCallback) {
							this.nextLevelCallback();
						}
						this.player.currentLevel += 1;
						this.b2Preview.offset.y = this.player.currentLevel;

						this.turnGravityOff(this.b2World, this.applyCurrentAtmosphericDamping);
						taskTimer.add(() => {
							this.pieceSpawnPoints5.forEach(vec2 => {
								const { meshName, colliderName } = getArchitecturePiece();
								createArchitectMeshAndFixtures({
									x: vec2.x,
									y: vec2.y + this.b2Preview.offset.y,
									angle: 0,
									meshName,
									// "collider" + randInt(3, 1),
									colliderName,
									categoryArray: ["architecture"],
									maskArray: ["penalty", "environment", "architecture", "goal"]
								}).then(pillar => {
									this.applyCurrentAtmosphericDamping(pillar.body);
									this.activeArchitectureBodies.push(pillar.body);
								});
							});

							this.goalLine.SetPosition(new Vec2(0, -0.25 + 1 * this.player.currentLevel));
							this.penaltyLine.SetPosition(new Vec2(0, -1.5 + 1 * this.player.currentLevel));
							this.player.currentTimer =
								__INITIAL_LEVEL_DURATION + this.player.currentLevel * __LEVEL_DURATION_INCREMENT;
							this.player.maxTimer =
								__INITIAL_LEVEL_DURATION + this.player.currentLevel * __LEVEL_DURATION_INCREMENT;

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

	protected scene: Scene;
	protected camera: Camera;
	protected bgColor: Color;
	protected b2Preview: Box2DPreviewMesh;

	private debugMode: boolean = getUrlFlag("debugMode");
	private autoClear = true;
	private gui = new SimpleGUIOverlay();
	private failedPieces: Body[] = [];

	private player = new Player();
	private cursorPosition: Vec2;
	private playerCursorBody: Body;
	private cursorJoint: MouseJoint | undefined;

	private activeArchitectureBodies: Body[] = [];

	private currentLinearDamping: number;
	private currentAngularDamping: number;

	private penaltyLine: Body;
	private goalLine: Body;

	private hourglassButton: Mesh<BufferGeometry, MeshBasicMaterial> | undefined;
	private _interactive: boolean;
	private _lastSelectedBody: Body | undefined;

	private _state: GameState = "uninitialized";

	private b2World: World;

	private _postUpdates: Array<(dt: number) => void> = [];

	constructor(
		private rayCastConverter?: RayCastConverter,
		private nextLevelCallback?: () => void,
		private gameResetCallback?: () => void,
		private pieceSelectedCallback?: (body?: Body) => void
	) {
		this.initiateScene();

		const b2World = new World(new Vec2(0, 0));
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

		this.currentLinearDamping = 5;
		this.currentAngularDamping = 5;

		this.pieceSpawnPoints5.forEach(vec2 => {
			const { meshName, colliderName } = getArchitecturePiece();
			createArchitectMeshAndFixtures({
				x: vec2.x,
				y: vec2.y,
				angle: 0,
				meshName,
				colliderName,
				categoryArray: ["architecture"],
				maskArray: ["penalty", "environment", "architecture", "goal"]
			}).then(pillar => {
				this.applyCurrentAtmosphericDamping(pillar.body);
				this.activeArchitectureBodies.push(pillar.body);
			});
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
							x: clickedb2Space.x,
							y: clickedb2Space.y,
							angle: 0,
							meshName,
							colliderName,
							categoryArray: ["architecture"],
							maskArray: ["penalty", "environment", "architecture", "goal"]
						}).then(pillar => {
							this.applyCurrentAtmosphericDamping(pillar.body);
							this.activeArchitectureBodies.push(pillar.body);
						});
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
						this.applyCurrentAtmosphericDamping(circleBody);
						this.activeArchitectureBodies.push(circleBody);
					}
					if (isKeyXDown) {
						this.turnGravityOn(b2World, this.applyCurrentAtmosphericDamping);
					}
					if (isKeyCDown) {
						this.turnGravityOff(b2World, this.applyCurrentAtmosphericDamping);
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

		getKeyboardInput().addListener((key, down) => {
			if (down) {
				if (key === "F5") {
					saveLevelDataToLocalStorage(this.player, this.b2World);
				} else if (key === "F9") {
					loadLevelDataFromLocalStorage(this.player, this.b2World);
				}
			}
		});
		this.state = "waitingForInput";
	} //+++++++++++++++++++++++++++END OF CONSTRUCTOR CURLY BRACKET++++++++++++++++++++++++++++++++//

	HandleKey(code: KeyboardCodes, down: boolean) {
		switch (code) {
			case "KeyQ":
				isKeyQDown = down;
				break;
			case "KeyZ":
				isKeyZDown = down;
				break;
			case "KeyX":
				isKeyXDown = down;
				break;
			case "KeyC":
				isKeyCDown = down;
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
		this.b2World.Step(dt, 10, 4);

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

	private turnGravityOff(b2World: World, applyCurrentAtmosphericDamping: (body: Body) => void) {
		b2World.SetGravity(new Vec2(0, 0));
		this.currentLinearDamping = 5;
		this.currentAngularDamping = 5;
		this.activeArchitectureBodies.forEach(applyCurrentAtmosphericDamping);
	}

	private turnGravityOn(b2World: World, applyCurrentAtmosphericDamping: (body: Body) => void) {
		b2World.SetGravity(new Vec2(0, -9.8));
		this.currentLinearDamping = 0;
		this.currentAngularDamping = 0;
		this.activeArchitectureBodies.forEach(applyCurrentAtmosphericDamping);
	}

	private applyCurrentAtmosphericDamping = (body: Body) => {
		body.SetLinearDamping(this.currentLinearDamping);
		body.SetAngularDamping(this.currentAngularDamping);
	};

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
