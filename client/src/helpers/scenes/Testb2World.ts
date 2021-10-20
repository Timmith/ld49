import {
	Body,
	BodyType,
	kinematicBody,
	LinearStiffness,
	MouseJoint,
	MouseJointDef,
	PolygonShape,
	Transform,
	Vec2,
	World
} from "box2d";
import { Camera, Color, Fog, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import device from "~/device";
import getKeyboardInput from "~/input/getKeyboardInput";
import { getLeaders, record } from "~/leaderboard";
import { Box2DPreviewMesh, debugPolygonPhysics } from "~/meshes/Box2DPreviewMesh";
import BaseContactListener from "~/physics/contact listeners/BaseContactListener";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { getBodyMeshEventManager } from "~/physics/managers/bodyMeshEventManager";
import { getBodyDestructionManager } from "~/physics/managers/destructionManager";
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
import {
	loadLevelData,
	loadLevelDataFromLocalStorage,
	saveLevelDataToLocalStorage,
	serializeWorld
} from "~/physics/utils/serialUtils";
import { __INITIAL_LEVEL_DURATION, __LEVEL_DURATION_INCREMENT, __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import { removeFromArray } from "~/utils/arrayUtils";
import { changeCursor } from "~/utils/cursorUtil";
import EventDispatcher from "~/utils/EventDispatcher";
import { KeyboardCodes } from "~/utils/KeyboardCodes";
import { getLocalStorageParam, setLocalStorageParam } from "~/utils/localStorage";
import { getUrlColor, getUrlFlag } from "~/utils/location";
import { RayCastConverter } from "~/utils/RayCastConverter";
import { taskTimer, TimedTask } from "~/utils/taskTimer";

import { getMetaContactListener } from "../../physics/utils/contactListenerUtils";
import { getArchitecturePiece } from "../architectureLibrary";
import Player from "../Player";
import { pieceSpawnPoints5 } from "../spawnPoints";
import { GameState, Piece, PieceState, WorldData } from "../types";
import { getCameraSlideDurationForLevel } from "../utils/getCameraSlideDurationForLevel";

const FOV = 35;
const MOBILE_FOV = 28;

let isKeyQDown: boolean = false;
let isKeyZDown: boolean = false;
let isKeyVDown: boolean = false;

const emptyUpdate = (dt: number) => {};
const noop = () => {};
const FIXED_PHYSICS_DT = 1 / 120;

const tempVec2 = new Vec2();
const heightOffset = 0.9;

function __alwaysAllowCursor(x: number, y: number) {
	return true;
}

export default class Testb2World {
	get state(): GameState {
		return this._state;
	}
	set state(value: GameState) {
		if (this.state !== value) {
			console.log(value);
			this._state = value;
			this.onStateChange.dispatch(value);
			this.stateUpdate = this.stateUpdates[value];
			this.stateChanges[value]();
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
	paused: boolean;

	autoClear = true;

	player = new Player();
	spectatorMode: boolean;

	onAnnouncementChange = new EventDispatcher<string>();
	onStateChange = new EventDispatcher<GameState>();
	onLevelChange = new EventDispatcher<number>();
	onPieceStateChange = new EventDispatcher<Body>();
	onCameraChange = new EventDispatcher<number>();
	onCursorStartEvent = new EventDispatcher<[number, number]>();

	b2World: World;

	protected scene: Scene;
	protected camera: Camera;
	protected bgColor: Color;
	protected b2Preview: Box2DPreviewMesh | undefined;
	private savedWorldBeforeSettling: WorldData;
	private simulating: boolean;

	private stateChanges: { [K in GameState]: () => void } = {
		uninitialized: noop,
		waitingForInput: () => {
			this.onCameraChange.dispatch(0);
			this.changeAnnouncement(`${device.isDesktop ? "Click" : "Touch"} to Start!`);
			this.simulating = false;
			this.interactive = true;
		},
		playing: () => {
			this.changeAnnouncement("");
			this.simulating = true;
			this.interactive = true;
		},
		settling: () => {
			this.changeAnnouncement("");
			this.interactive = false;
			this.simulating = true;
			this.turnGravityOn();
			// this.colorizeHourglassButton(COLOR_HOURGLASS_UNAVAILABLE);
			this.delayedGameEvent(() => {
				if (!this.spectatorMode) {
					this.state = "checking";
				}
			}, 5);
		},
		checking: () => {
			let contact = this.goalLine.m_contactList;
			this.simulating = true;
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
		},
		transitioning: () => {
			this.simulating = false;
			for (const body of this.activeArchitectureBodies) {
				const userData = body.GetUserData();
				if (isArchitectParams(userData) && userData.level < this.player.currentLevel - 2) {
					this.setPieceMode(body, "frozen");
				}
			}
		},
		gameOver: async () => {
			if (this.spectatorMode) {
				return;
			}

			this.simulating = false;
			const height = this.player.currentHeight * __PHYSICAL_SCALE_METERS;
			const score = ~~(height * 100);
			try {
				const leaders = await getLeaders(10, 0);
				let submitPlace = leaders.length < 10 ? leaders.length : -1;
				if (submitPlace === -1) {
					for (const leader of leaders) {
						if (leader.score < score) {
							submitPlace = leader.place;
							break;
						}
					}
				}
				if (submitPlace !== -1) {
					let initials = getLocalStorageParam("initials") || `---`;
					do {
						initials =
							window.prompt(
								`You ranked ${submitPlace} at ${height.toFixed(2)}m! Input your initials (3 chars):`,
								(initials + `---`).slice(0, 3)
							) || "---";
					} while (initials.length !== 3);
					setLocalStorageParam("initials", initials);

					const result = await record({
						score,
						summary: initials,
						details: JSON.stringify(this.savedWorldBeforeSettling)
					});
					if (result.ok) {
						getLeaders(10);
					}
				}
			} catch (e) {
				console.warn("Leaderboard not available");
			}

			this.onCameraChange.dispatch(0);
			this.delayedGameEvent(() => {
				for (const body of this.activeArchitectureBodies) {
					const userData = body.GetUserData();
					if (isArchitectParams(userData)) {
						this.setPieceMode(body, "falling");
					}
				}
				this.changeAnnouncement("Game Over!");
				this.simulating = true;
			}, 0.5);
			// console.log("Sorry, you lost!");

			this.delayedGameEvent(() => {
				this.failedPieces.length = 0;
				this.activeArchitectureBodies.forEach(body => {
					const fixt = body.GetFixtureList();
					if (fixt) {
						getBodyDestructionManager(this.b2World).queueDestruction(fixt.GetBody());
					}
				});
				this.activeArchitectureBodies.length = 0;
			}, 9);

			this.delayedGameEvent(() => {
				this.changeLevel(0);
				this.spawn5Pieces();
				this.player.currentHeight = 0;
				this.player.currentHealth = 5;
				this.state = "waitingForInput";
			}, 10);
		}
	};

	private stateUpdate: (dt: number) => void;

	private stateUpdates: { [K in GameState]: (dt: number) => void } = {
		uninitialized: emptyUpdate,

		waitingForInput: (dt: number) => {
			if (this.player.currentHealth === 0) {
				this.state = "gameOver";
			}
		},

		playing: (dt: number) => {
			this.player.currentTimer -= dt;
			this.updateHeightMeasurement();
			// Responsible for level end & checking, settling, gameOver
			if (this.player.currentTimer < 0) {
				this.player.currentTimer = 0;
				if (!this.spectatorMode) {
					this.savedWorldBeforeSettling = serializeWorld(this.state, this.player, this.b2World);
				}
				this.state = "settling";
			} else if (this.player.currentHealth === 0 && !this.spectatorMode) {
				this.state = "gameOver";
			}
		},

		settling: () => {
			this.updateHeightMeasurement();
		},

		checking: emptyUpdate,

		transitioning: emptyUpdate,

		gameOver: emptyUpdate
	};

	private debugMode: boolean = getUrlFlag("debugMode");
	private failedPieces: Body[] = [];
	private cursorPosition: Vec2;
	private playerCursorBody: Body;
	private cursorJoint: MouseJoint | undefined;

	private activeArchitectureBodies: Body[] = [];

	private penaltyLine: Body;
	private goalLine: Body;

	private timedTasks: TimedTask[] = [];
	private _interactive: boolean;
	private _isCameraChanging: boolean = false;

	private _state: GameState = "uninitialized";

	private _postUpdates: Array<(dt: number) => void> = [];

	constructor(
		private rayCastConverter?: RayCastConverter,
		private _cursorClearCheck: (x: number, y: number) => boolean = __alwaysAllowCursor,
		drawDebugPhysics = true
	) {
		this.initiateScene();

		const b2World = new World(new Vec2(0, 0));
		b2World.SetGravity(new Vec2(0, -9.8));

		getBodyEventManager(b2World).init(b2World);
		getBodyMeshEventManager(b2World).init(b2World);
		getBodyDestructionManager(b2World).init(b2World);

		if (drawDebugPhysics) {
			const b2Preview = new Box2DPreviewMesh(b2World);
			this.b2Preview = b2Preview;
			if (this.b2Preview && !rayCastConverter) {
				this.rayCastConverter = convertTob2Space.bind(null, this.b2Preview);
			}
			this.scene.add(this.b2Preview);
			debugPolygonPhysics.value = true;
		}
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
			getBodyDestructionManager(b2World).queueDestruction(body);
			removeFromArray(this.activeArchitectureBodies, body);
		});
		mcl.register(bcl);
		this.b2World.SetContactListener(mcl);

		/* The Be All And End All Keyboard Listener (a.k.a. THE BUTTON FUNNELER) */
		getKeyboardInput().addListener(this.HandleKey);

		/* Character Spawn/Control */

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

		/* Initiate Base Platform/Environment */
		createStaticBox(this.b2World, 0, -1, 2, 0.1);
		createStaticBox(this.b2World, -1, -0.9, 0.2, 0.1);
		createStaticBox(this.b2World, 1, -0.9, 0.2, 0.1);

		this.penaltyLine = createSensorBox(this.b2World, 0, -1.5, 10, 0.1, ["penalty"], ["architecture"]);
		this.goalLine = createSensorBox(this.b2World, 0, -0.25, 10, 0.1, ["goal"], ["architecture", "environment"]);

		setTimeout(() => {
			if (!this.spectatorMode) {
				this.spawn5Pieces();
			}
		}, 100);

		function getFirstTouch(touchEvent: TouchEvent) {
			return touchEvent.touches.item(0)!;
		}

		const onMouseDown = (mouseClick: MouseEvent) => {
			this.onCursorStart(mouseClick.clientX, mouseClick.clientY);
		};
		const onTouchStart = (touchEvent: TouchEvent) => {
			const touch = getFirstTouch(touchEvent);
			this.onCursorStart(touch.clientX, touch.clientY);
		};
		const onMouseUp = (mouseUp: MouseEvent) => {
			this.onCursorStop();
		};
		const onTouchEnd = (touchEvent: TouchEvent) => {
			this.onCursorStop();
		};
		const onMouseMove = (mouseMove: MouseEvent) => {
			this.onCursorMove(mouseMove.clientX, mouseMove.clientY);
		};

		const onTouchMove = (touchEvent: TouchEvent) => {
			const touch = getFirstTouch(touchEvent);
			this.onCursorMove(touch.clientX, touch.clientY);
		};

		const onMouseWheel = (wheel: WheelEvent) => {
			// console.log(` Wheel deltas:
			// 			 X: ${wheel.deltaX}
			// 			 Y: ${wheel.deltaY}
			// 			 Z: ${wheel.deltaZ}`);
			/* Only the deltaY changes with mouseWheel interaction 
				wheel.deltaY = -125 when wheelUp
				wheel.deltaY = 125 when wheelDown */

			if (this.state === "waitingForInput" || this.state === "settling" || this.state === "checking") {
				const value = wheel.deltaY > 0 ? -1 : 1;

				if (!this._isCameraChanging) {
					this._isCameraChanging = true;
					this.onCameraChange.dispatch(value);
					taskTimer.add(() => {
						this._isCameraChanging = false;
					}, 0.5);
				}
			}
		};

		document.addEventListener("mousedown", onMouseDown, false);
		document.addEventListener("mouseup", onMouseUp, false);
		document.addEventListener("mousemove", onMouseMove, false);
		document.addEventListener("touchstart", onTouchStart, false);
		document.addEventListener("touchend", onTouchEnd, false);
		document.addEventListener("touchmove", onTouchMove, false);

		document.addEventListener("wheel", onMouseWheel, false);

		getKeyboardInput().addListener(async (key, down) => {
			if (down) {
				if (key === "F5") {
					saveLevelDataToLocalStorage(this.state, this.player, this.b2World);
				} else if (key === "F9") {
					const bdm = getBodyDestructionManager(b2World);
					this.activeArchitectureBodies.forEach(body => bdm.queueDestruction(body));
					this.activeArchitectureBodies.length = 0;

					const data = await loadLevelDataFromLocalStorage(this.b2World, this.player, this.onNewPiece);
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
	async loadGame(data: WorldData, spectatorMode = true) {
		this.spectatorMode = spectatorMode;
		const bdm = getBodyDestructionManager(this.b2World);
		this.activeArchitectureBodies.forEach(body => bdm.queueDestruction(body));
		this.activeArchitectureBodies.length = 0;
		await loadLevelData(this.b2World, this.player, data, this.onNewPiece);
		this.changeLevel(data.player.currentLevel, false);
		this.state = data.gameState;
		if (spectatorMode) {
			this.player.currentTimer = getCameraSlideDurationForLevel(this.player.currentLevel) * 0.001;
			this.delayedGameEvent(() => {
				// console.log("delay fired");
				for (const body of this.activeArchitectureBodies) {
					const userData = body.GetUserData();
					if (isArchitectParams(userData)) {
						this.setPieceMode(body, "falling");
					}
				}
			}, this.player.currentTimer + 0.5);
		}
	}

	changeAnnouncement(message: string) {
		this.onAnnouncementChange.dispatch(message);
	}

	updateHeightMeasurement() {
		const topThree = this.activeArchitectureBodies
			.sort((a, b) => b.GetPosition().y - a.GetPosition().y)
			.slice(0, Math.min(3, this.activeArchitectureBodies.length));
		const height =
			topThree.reduce<number>((tallestHeight, body) => {
				let currentHeight = -Infinity;
				let fixt = body.GetFixtureList();
				const t = body.GetTransform();
				while (fixt) {
					const shape = fixt.GetShape();
					if (shape instanceof PolygonShape) {
						for (const v of shape.m_vertices) {
							Transform.MulXV(t, v, tempVec2);
							currentHeight = Math.max(currentHeight, tempVec2.y);
						}
					}
					fixt = fixt.m_next;
				}
				return Math.max(tallestHeight, currentHeight);
			}, -Infinity) + heightOffset;
		this.player.currentHeight = height;
		// console.log((height * __PHYSICAL_SCALE_METERS).toFixed(2));
	}
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
		pieceSpawnPoints5.forEach(vec2 => {
			const { meshName, colliderName } = getArchitecturePiece();
			createArchitectMeshAndFixtures(this.b2World, {
				level: this.player.currentLevel,
				state: "floating",
				x: vec2.x,
				y: vec2.y + this.player.currentLevel,
				vx: 0,
				vy: 0,
				angle: 0,
				vAngle: 0,
				meshName,
				// "collider" + randInt(3, 1),
				colliderName,
				categoryArray: ["architecture"],
				maskArray: ["penalty", "environment", "architecture", "goal"]
			}).then(this.onNewPiece);
		});
	}
	changeLevel(level: number, resetPlayerTimer = true) {
		this.player.currentLevel = level;
		if (this.b2Preview) {
			this.b2Preview.offset.y = level;
		}

		this.goalLine.SetPosition(new Vec2(0, -0.25 + level));
		this.penaltyLine.SetPosition(new Vec2(0, -1.5 + level));

		if (resetPlayerTimer) {
			this.player.maxTimer = __INITIAL_LEVEL_DURATION + level * __LEVEL_DURATION_INCREMENT;
			this.player.currentTimer = this.player.maxTimer;
		}

		this.onLevelChange.dispatch(level);
	}
	onNewPiece = (piece: Piece) => {
		this.activeArchitectureBodies.push(piece.body);
		this.setPieceMode(piece.body);
		this.onPieceStateChange.dispatch(piece.body);
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
		if (this.simulating && !this.paused) {
			const targetPhysicsTime = this.player.physicsTime + dt;

			while (this.player.physicsTime < targetPhysicsTime) {
				this.player.physicsTime += FIXED_PHYSICS_DT;
				this.b2World.Step(FIXED_PHYSICS_DT, 5, 2);
			}
		}

		for (const pu of this._postUpdates) {
			pu(dt);
		}
		if (this.b2Preview) {
			this.b2Preview.update(dt);
		}

		getBodyDestructionManager(this.b2World).processDestructions();
		processHUD(dt, this.player);
		this.stateUpdate(dt);
	}

	render(renderer: WebGLRenderer) {
		if (this.autoClear) {
			renderer.setClearColor(this.bgColor, 1);
			renderer.clear(true, true, true);
		}
		renderer.render(this.scene, this.camera);
	}

	protected onCursorStart(x: number, y: number) {
		this.onCursorStartEvent.dispatch([x, y]);
		if (this._cursorClearCheck(x, y)) {
			if (this.state === "waitingForInput") {
				this.onLevelChange.dispatch(this.player.currentLevel);
				// taskTimer.add(()=>{},2)
				// meaning to add a delay if the screen needs to transition to the player's current level play height
				// cannot do it this way, as player is able to interact with pieces before the level timer starts decrementing
				this.state = "playing";
			}
			this.cursorPosition = this.rayCastConverter!(x, y);
			const clickedb2Space: Vec2 = this.rayCastConverter!(x, y);

			if (this.interactive) {
				const body = queryForSingleArchitectureBody(this.b2World, clickedb2Space);

				if (body) {
					this.attachCursorJoint(clickedb2Space, body);
				}
			}

			if (this.debugMode) {
				if (isKeyQDown) {
					const { meshName, colliderName } = getArchitecturePiece();
					createArchitectMeshAndFixtures(this.b2World, {
						level: this.player.currentLevel,
						state: "floating",
						x: clickedb2Space.x,
						y: clickedb2Space.y,
						vx: 0,
						vy: 0,
						angle: 0,
						vAngle: 0,
						meshName,
						colliderName,
						categoryArray: ["architecture"],
						maskArray: ["penalty", "environment", "architecture", "goal"]
					}).then(this.onNewPiece);
				}
				if (isKeyZDown) {
					const circleBody = createImprovedPhysicsCircle(
						this.b2World,
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
	}
	protected onCursorStop() {
		this.detachCursorJoint();
	}
	protected onCursorMove(x: number, y: number) {
		if (this._cursorClearCheck(x, y)) {
			const cursorInB2Space: Vec2 = this.rayCastConverter!(x, y);

			this.cursorPosition = this.rayCastConverter!(x, y);
			this.playerCursorBody.SetPosition(this.cursorPosition);
			if (this.cursorJoint) {
				changeCursor("grabbing", 0);
				this.cursorJoint.SetTarget(this.cursorPosition);
			} else {
				if (this.interactive) {
					changeCursor(queryForSingleArchitectureBody(this.b2World, cursorInB2Space) ? "grab" : "default", 0);
				}
			}
		}
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

	private turnGravityOn() {
		this.activeArchitectureBodies.forEach(body => {
			const userData = body.GetUserData();
			if (isArchitectParams(userData) && userData.state === "floating") {
				this.setPieceMode(body, "falling");
			}
		});
	}

	private setPieceMode(body: Body, state?: PieceState) {
		const userData = body.GetUserData();
		if (isArchitectParams(userData)) {
			if (state === undefined) {
				state = userData.state;
			} else {
				userData.state = state;
				this.onPieceStateChange.dispatch(body);
			}
			switch (state) {
				case "floating":
					body.SetGravityScale(0);
					body.SetLinearDamping(5);
					body.SetAngularDamping(5);
					body.SetType(BodyType.b2_dynamicBody);
					break;
				case "falling":
					body.SetGravityScale(1);
					body.SetLinearDamping(0);
					body.SetAngularDamping(0);
					body.SetAwake(true);
					body.SetType(BodyType.b2_dynamicBody);
					break;
				case "frozen":
					body.SetType(BodyType.b2_staticBody);
			}
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
