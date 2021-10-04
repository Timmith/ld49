import { Body, Vec2, World } from "box2d";
import { Camera, Color, Fog, PerspectiveCamera, Scene, WebGLRenderer } from "three";
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
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
import { KeyboardCodes } from "~/utils/KeyboardCodes";
import { getUrlColor } from "~/utils/location";
import { RayCastConverter } from "~/utils/RayCastConverter";
import { taskTimer } from "~/utils/taskTimer";

import { startControls } from "../../controllers/startControls";
import { getMetaContactListener } from "../../physics/utils/contactListenerUtils";

const FOV = 35;
const MOBILE_FOV = 28;

let isKeyQDown: boolean = false;
let isKeyZDown: boolean = false;
let isKeyXDown: boolean = false;
let isKeyCDown: boolean = false;
let isKeyVDown: boolean = false;

export default class Testb2World {
	autoClear = true;
	gui = new SimpleGUIOverlay();
	cursorPosition: Vec2;
	selectedBody: Body | undefined;
	lastSelectedBody: Body | undefined;

	player = new Player();
	activeArchitectureBodies: Body[] = [];
	inactiveArchitectureBodies: Body[] = [];
	currentLevel: number = 0;

	pivotPoint: Vec2 | undefined;
	isTurningBody: boolean;
	isStarted: boolean = false;
	isTimerOver: boolean = false;

	currentLinearDamping: number;
	currentAngularDamping: number;

	penaltyLine: Body;
	goalLine: Body;

	checkWinCondition: boolean;
	isGameOver: boolean;

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
	readyForLevelStart: boolean = true;
	noInteract: boolean;

	protected scene: Scene;
	protected camera: Camera;
	protected bgColor: Color;
	protected b2Preview: Box2DPreviewMesh;

	private b2World: World;

	private _postUpdates: Array<(dt: number) => void> = [];

	constructor(
		private rayCastConverter?: RayCastConverter,
		private nextLevelCallback?: () => void,
		private gameResetCallback?: () => void
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
		mcl.register(new BaseContactListener());
		this.b2World.SetContactListener(mcl);

		/* The Be All And End All Keyboard Listener (a.k.a. THE BUTTON FUNNELER) */
		getKeyboardInput().addListener(this.HandleKey);

		/* Character Spawn/Control */
		this._postUpdates.push(startControls(this.b2World, rayCastConverter!, this.gui, this.b2Preview, this.player));

		/* Test Environment */

		createStaticBox(this.b2World, 0, -1, 2, 0.1);
		createStaticBox(this.b2World, -1, -0.9, 0.2, 0.1);
		createStaticBox(this.b2World, 1, -0.9, 0.2, 0.1);

		this.penaltyLine = createSensorBox(this.b2World, 0, -1.5, 10, 0.1, ["penalty"], ["architecture"]);
		this.goalLine = createSensorBox(this.b2World, 0, -0.25, 10, 0.1, ["goal"], ["architecture"]);

		this.currentLinearDamping = 5;
		this.currentAngularDamping = 5;

		this.pieceSpawnPoints9.forEach(vec2 => {
			createArchitectMeshAndFixtures(
				vec2.x,
				vec2.y,
				"column1",
				// "collider" + randInt(3, 1),
				"collider1",
				["architecture"],
				["penalty", "environment", "architecture", "goal"],
				this.player
			).then(pillar => {
				this.applyCurrentAtmosphericDamping(pillar.body);
				this.activeArchitectureBodies.push(pillar.body);
			});
		});

		// const cm = b2World.GetContactManager();
		// let contacts = cm.m_contactList;
		// while (contacts) {
		// 	if (contacts.IsTouching()) {
		// 		fixtureVertsCount += (__contactMarkerSegs + 3) * 2;
		// 	}
		// 	contacts = contacts.m_next;
		// }

		// 1.3 meters tall
		// 0.35 meters wide
		// 0.6 meters thick base

		const onDebugMouseDown = (mouseClick: MouseEvent) => {
			if (this.readyForLevelStart) {
				this.isStarted = true;
				this.readyForLevelStart = false;
			}

			this.gui.rayCastForButton(mouseClick.clientX, mouseClick.clientY);

			this.cursorPosition = this.rayCastConverter!(mouseClick.clientX, mouseClick.clientY);
			const clickedb2Space: Vec2 = this.rayCastConverter!(mouseClick.x, mouseClick.y);

			if (isKeyQDown) {
				createArchitectMeshAndFixtures(
					clickedb2Space.x,
					clickedb2Space.y,
					"column1",
					// "collider" + randInt(3, 1),
					"collider1",
					["architecture"],
					["penalty", "environment", "architecture", "goal"],
					this.player
				).then(pillar => {
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

			if (!this.noInteract) {
				this.selectedBody = queryForSingleArchitectureBody(b2World, clickedb2Space);

				if (this.selectedBody) {
					this.lastSelectedBody = this.selectedBody;
				} else if (!this.selectedBody && this.lastSelectedBody) {
					this.pivotPoint = clickedb2Space;
					this.isTurningBody = true;
				}
			}

			/* CONSOLE LOG to notify of click in client space versus game space */
			// console.log(` Client Space				VS		Game Space
			// 		 X: ${mouseClick.clientX}			X: ${clickedb2Space.x}
			// 		 Y: ${mouseClick.clientY}			Y: ${clickedb2Space.y}`);
		};

		const onDebugMouseUp = (mouseUp: MouseEvent) => {
			this.selectedBody = undefined;
			this.pivotPoint = undefined;
			this.isTurningBody = false;

			if (this.lastSelectedBody) {
				this.lastSelectedBody.SetAngularVelocity(0);
			}
		};

		const onDebugMouseMove = (mouseMove: MouseEvent) => {
			this.cursorPosition = this.rayCastConverter!(mouseMove.clientX, mouseMove.clientY);
			if (this.selectedBody) {
				this.selectedBody.SetLinearVelocity(new Vec2(0.0001, 0));
				// hacky way of getting the currently dragged about piece to interact with other pieces
			}
		};

		document.addEventListener("mousedown", onDebugMouseDown, false);
		document.addEventListener("mouseup", onDebugMouseUp, false);
		document.addEventListener("mousemove", onDebugMouseMove, false);
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

		// Responsible for click and drag of architecture bodies
		if (this.selectedBody) {
			this.selectedBody.SetPosition(this.cursorPosition);
		}
		// Responsible for rotation of architecture bodies
		if (!this.selectedBody && this.lastSelectedBody && this.isTurningBody && this.pivotPoint) {
			const delta =
				this.pivotPoint
					.Clone()
					.SelfSub(this.cursorPosition)
					.Normalize() * 10;
			let coefficient: number = 1;
			if (this.pivotPoint.x < this.cursorPosition.x) {
				coefficient = -1;
			}
			this.lastSelectedBody.SetAngularVelocity(coefficient * delta);
		}

		for (const pu of this._postUpdates) {
			pu(dt);
		}
		if (this.b2Preview) {
			this.b2Preview.update(dt);
		}
		processDestructions();
		processHUD(dt, this.player);

		// Starts the Level Timer
		if (this.isStarted) {
			this.player.currentTimer -= dt;
			if (this.player.currentTimer < 0) {
				this.player.currentTimer = 0;
				this.isTimerOver = true;
				this.isStarted = false;
			}
		}

		// Checks Win Condition when isTimerOver
		if (this.isTimerOver) {
			this.noInteract = true;

			this.selectedBody = undefined;
			this.lastSelectedBody = undefined;

			this.turnGravityOn(this.b2World, this.applyCurrentAtmosphericDamping);
			taskTimer.add(() => {
				let contact = this.goalLine.m_contactList;
				this.currentLevelWinCondition = false;

				while (contact) {
					if (contact.contact.IsTouching()) {
						this.currentLevelWinCondition = true;
						break;
					}
					contact = contact.next;
				}

				this.activeArchitectureBodies.forEach(body => {
					let fixt = body.GetFixtureList();
					while (fixt) {
						const bitMask = makeBitMask(["environment"]);
						fixt.m_filter.categoryBits = bitMask;
						fixt = fixt.m_next;
					}
				});

				this.noInteract = false;
			}, 5);

			this.isTimerOver = false;
		}

		if (this.currentLevelWinCondition === true) {
			console.log("Congrats, you passed the first level!");
			if (this.nextLevelCallback) {
				this.nextLevelCallback();
			}
			this.currentLevel += 1;
			this.b2Preview.offset.y = this.currentLevel;

			// this.activeArchitectureBodies.forEach(body => {
			// 	let fixt = body.GetFixtureList();
			// 	while (fixt) {
			// 		const bitMask = makeBitMask(["environment"]);
			// 		fixt.m_filter.categoryBits = bitMask;
			// 		fixt = fixt.m_next;
			// 	}
			// });

			this.turnGravityOff(this.b2World, this.applyCurrentAtmosphericDamping);
			taskTimer.add(() => {
				this.pieceSpawnPoints9.forEach(vec2 => {
					createArchitectMeshAndFixtures(
						vec2.x,
						vec2.y + this.b2Preview.offset.y,
						"column1",
						// "collider" + randInt(3, 1),
						"collider1",
						["architecture"],
						["penalty", "environment", "architecture", "goal"],
						this.player
					).then(pillar => {
						this.applyCurrentAtmosphericDamping(pillar.body);
						this.activeArchitectureBodies.push(pillar.body);
					});
				});
				this.goalLine.SetPosition(new Vec2(0, -0.25 + 1 * this.currentLevel));
				this.penaltyLine.SetPosition(new Vec2(0, -1.5 + 1 * this.currentLevel));
				this.player.currentTimer = 20 + this.currentLevel * 10;
				this.player.maxTimer = 20 + this.currentLevel * 10;
				this.readyForLevelStart = true;
			}, 2);

			this.currentLevelWinCondition = undefined;

			// const centerOfScreen = this.rayCastConverter!(window.innerWidth / 2, window.innerHeight / 2);

			// this.goalLine.SetPosition(new Vec2(0, -0.25 * (0.8 * this.currentLevel)));
			// this.penaltyLine.SetPosition(new Vec2(0, -1.5 * (0.8 * this.currentLevel)));
		} else if (this.currentLevelWinCondition === false) {
			console.log("Sorry, you lost!");
			this.currentLevel = 0;
			this.b2Preview.offset.y = this.currentLevel;

			this.selectedBody = undefined;
			this.lastSelectedBody = undefined;

			if (this.gameResetCallback) {
				this.gameResetCallback();
			}

			this.activeArchitectureBodies.forEach(body => {
				const fixt = body.GetFixtureList();
				if (fixt) {
					queueDestruction(fixt);
				}
			});
			this.activeArchitectureBodies.length = 0;
			this.currentLevelWinCondition = undefined;

			this.turnGravityOff(this.b2World, this.applyCurrentAtmosphericDamping);
			taskTimer.add(() => {
				this.pieceSpawnPoints9.forEach(vec2 => {
					createArchitectMeshAndFixtures(
						vec2.x,
						vec2.y + this.b2Preview.offset.y,
						"column1",
						// "collider" + randInt(3, 1),
						"collider1",
						["architecture"],
						["penalty", "environment", "architecture", "goal"],
						this.player
					).then(pillar => {
						this.applyCurrentAtmosphericDamping(pillar.body);
						this.activeArchitectureBodies.push(pillar.body);
					});
				});
				this.goalLine.SetPosition(new Vec2(0, -0.25 + 1 * this.currentLevel));
				this.penaltyLine.SetPosition(new Vec2(0, -1.5 + 1 * this.currentLevel));
				this.player.currentTimer = 20 + this.currentLevel * 10;
				this.player.maxTimer = 20 + this.currentLevel * 10;
				this.player.currentHealth = 5;
				this.readyForLevelStart = true;
			}, 2);
		}

		// TODO
	}

	render(renderer: WebGLRenderer, dt: number) {
		if (this.autoClear) {
			renderer.setClearColor(this.bgColor, 1);
			renderer.clear(true, true, true);
		}
		renderer.render(this.scene, this.camera);
		this.gui.render(renderer);
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
		scene.fog = new Fog(bgColor.getHex(), 0, 60);
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

export class Player {
	currentHealth: number = 5;
	maxHealth: number = 5;

	currentTimer: number = 20;
	maxTimer: number = 20;
}
