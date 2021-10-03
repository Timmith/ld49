import { Body, Vec2, World } from "box2d";
import { Camera, Color, Fog, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import device from "~/device";
import getKeyboardInput from "~/input/getKeyboardInput";
import { Box2DPreviewMesh, debugPolygonPhysics } from "~/meshes/Box2DPreviewMesh";
import BaseContactListener from "~/physics/contact listeners/BaseContactListener";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { processDestructions } from "~/physics/managers/destructionManager";
import {
	convertTob2Space,
	createDynamicBox,
	createImprovedPhysicsCircle,
	createSensorBox,
	createStaticBox,
	queryForSingleArchitectureBody
} from "~/physics/utils/physicsUtils";
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
import { KeyboardCodes } from "~/utils/KeyboardCodes";
import { getUrlColor } from "~/utils/location";
import { RayCastConverter } from "~/utils/RayCastConverter";

import { startControls } from "../../controllers/startControls";
import { getMetaContactListener } from "../../physics/utils/contactListenerUtils";

const FOV = 35;
const MOBILE_FOV = 28;

let isKeyQDown: boolean = false;
let isKeyZDown: boolean = false;
let isKeyXDown: boolean = false;
let isKeyCDown: boolean = false;

export default class Testb2World {
	autoClear = true;
	ui = new SimpleGUIOverlay();
	cursorPosition: Vec2;
	selectedBody: Body | undefined;
	lastSelectedBody: Body | undefined;

	playerHealth: number = 5;

	bodies: Body[] = [];
	isTurningShape: boolean;
	pivotPoint: Vec2 | undefined;

	protected scene: Scene;
	protected camera: Camera;
	protected bgColor: Color;

	protected b2World: World;
	protected b2Preview: Box2DPreviewMesh | undefined = undefined;

	private _postUpdates: Array<(dt: number) => void> = [];

	constructor(private rayCastConverter?: RayCastConverter) {
		this.initiateScene();

		const b2World = new World(new Vec2(0, 0));
		getBodyEventManager().init(b2World);

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

		// const shootRayClosest = new RayCastClosestCallback();

		/* The Be All And End All Keyboard Listener (a.k.a. THE BUTTON FUNNELER) */
		getKeyboardInput().addListener(this.HandleKey);

		/* Character Spawn/Control */
		this._postUpdates.push(startControls(this.b2World, rayCastConverter!, this.ui, this.b2Preview));

		/* Test Environment */

		createStaticBox(this.b2World, 0, -1, 2, 0.1);
		createStaticBox(this.b2World, -1, -0.9, 0.2, 0.1);
		createStaticBox(this.b2World, 1, -0.9, 0.2, 0.1);

		createSensorBox(this.b2World, 0, -1.5, 10, 0.1, ["penalty"], ["architecture"]);
		createSensorBox(this.b2World, 0, 1, 10, 0.1, ["goal"], ["architecture"]);

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
			this.cursorPosition = this.rayCastConverter!(mouseClick.clientX, mouseClick.clientY);
			const clickedb2Space: Vec2 = this.rayCastConverter!(mouseClick.x, mouseClick.y);

			if (isKeyQDown) {
				const pillarBody = createDynamicBox(
					b2World,
					clickedb2Space.x,
					clickedb2Space.y,
					0.2,
					0.8,
					["architecture"],
					["penalty", "environment", "architecture", "goal"]
				);
				pillarBody.SetLinearDamping(5);
				pillarBody.SetAngularDamping(5);

				this.bodies.push(pillarBody);
			}
			if (isKeyZDown) {
				const circleBody = createImprovedPhysicsCircle(
					b2World,
					clickedb2Space.x,
					clickedb2Space.y,
					0.2,
					["architecture"],
					["penalty", "environment", "architecture", "goal"]
				);
				circleBody.SetLinearDamping(5);
				circleBody.SetAngularDamping(5);

				this.bodies.push(circleBody);
			}
			if (isKeyXDown) {
				b2World.SetGravity(new Vec2(0, -9.8));
				for (const body of this.bodies) {
					body.SetLinearDamping(0);
					body.SetAngularDamping(0);
				}
			}
			if (isKeyCDown) {
				b2World.SetGravity(new Vec2(0, 0));
				for (const body of this.bodies) {
					body.SetLinearDamping(5);
					body.SetAngularDamping(5);
				}
			}

			this.selectedBody = queryForSingleArchitectureBody(b2World, clickedb2Space);

			if (this.selectedBody) {
				this.lastSelectedBody = this.selectedBody;
			} else if (!this.selectedBody && this.lastSelectedBody) {
				this.pivotPoint = clickedb2Space;

				this.isTurningShape = true;
			}

			/* CONSOLE LOG to notify of click in client space versus game space */
			// console.log(` Client Space				VS		Game Space			VS		distFromPlayer
			// 		 X: ${mouseClick.clientX}			X: ${clickedb2Space.x}		dist: ${distanceFromPlayer}
			// 		 Y: ${mouseClick.clientY}			Y: ${clickedb2Space.y}`);
		};

		const onDebugMouseUp = (mouseUp: MouseEvent) => {
			this.selectedBody = undefined;
			this.pivotPoint = undefined;
			this.isTurningShape = false;

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

			if (!this.selectedBody && this.lastSelectedBody && this.isTurningShape && this.pivotPoint) {
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
			default:
				//console.log(code);
				break;
		}
	}

	update(dt: number) {
		this.scene.updateMatrixWorld(false);
		this.b2World.Step(dt, 10, 4);

		if (this.selectedBody) {
			this.selectedBody.SetPosition(this.cursorPosition);
		}

		for (const pu of this._postUpdates) {
			pu(dt);
		}

		if (this.b2Preview) {
			this.b2Preview.update(dt);
		}

		processDestructions();
		// processHUD(dt);
	}

	render(renderer: WebGLRenderer, dt: number) {
		if (this.autoClear) {
			renderer.setClearColor(this.bgColor, 1);
			renderer.clear(true, true, true);
		}
		renderer.render(this.scene, this.camera);
		this.ui.render(renderer);
	}

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
