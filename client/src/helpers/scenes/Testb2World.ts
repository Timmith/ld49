import { Body, Vec2, World } from "box2d";
import { Camera, Color, Fog, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import device from "~/device";
import getKeyboardInput from "~/input/getKeyboardInput";
import { Box2DPreviewMesh, debugPolygonPhysics } from "~/meshes/Box2DPreviewMesh";
import BaseContactListener from "~/physics/contact listeners/BaseContactListener";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { processDestructions } from "~/physics/managers/destructionManager";
import { processHUD } from "~/physics/managers/hudManager";
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
	selectedBody: Body | undefined;

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

		createSensorBox(
			this.b2World,
			0,
			-1.5,
			10,
			0.1,
			undefined,
			undefined,
			undefined,
			["penalty"],
			["architecture"],
			true
		);
		createSensorBox(this.b2World, 0, 1, 10, 0.1, undefined, undefined, undefined, ["goal"], ["architecture"], true);

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
			const clickedb2Space: Vec2 = this.rayCastConverter!(mouseClick.x, mouseClick.y);
			// const playerPosition: Vec2 = this.b2Preview
			// 	? this.b2Preview.offset
			// 	: this.rayCastConverter!(window.innerWidth / 2, window.innerHeight / 2);
			// const vectorFromPlayer: Vec2 = clickedb2Space.Clone().SelfSub(playerPosition); //BULLET SPAWN POINT
			/* Vector from player to clicked target location (clone clicked b2Space coordinates), as if there was no offset (subtract player position from vector), normalized (for small unit length), and scaled to be used to apply a force (like knockback) later */
			// const distanceFromPlayer = vectorFromPlayer.Length();
			/* distanceFromPlayer is used to set the relative TimedTask of applying LinearDamping to throwGeneric object */
			// vectorFromPlayer.SelfNormalize();
			// vectorFromPlayer.SelfMul(0.0075); //BULLET SPEED
			/* Cast the Ray; retrieve the reference to hitBody and corresponding userData, subtract 1 Health, destroy if isDead (WHILE HOLDING Q) */
			if (isKeyQDown) {
				createDynamicBox(
					b2World,
					clickedb2Space.x,
					clickedb2Space.y,
					0.2,
					0.8,
					undefined,
					undefined,
					undefined,
					["architecture"],
					["penalty", "environment", "architecture", "goal"]
				);
			}
			if (isKeyZDown) {
				createImprovedPhysicsCircle(
					b2World,
					clickedb2Space.x,
					clickedb2Space.y,
					0.2,
					["architecture"],
					["penalty", "environment", "architecture", "goal"]
				);
			}
			if (isKeyXDown) {
				b2World.SetGravity(new Vec2(0, -9.8));
			}
			if (isKeyCDown) {
				b2World.SetGravity(new Vec2(0, 0));
			}

			// TODO
			// when alternating between gravity On/Off
			// loop over all the current objects in play and setLinearDamping to really high when gravity is Off
			// and setLinearDamping to moderate when gravity is On

			// TODO
			// players and player controls will directly manipulate the cursorBody,
			// which will be able to select/grab and rotate pieces

			// if (isKeyVDown) {

			this.selectedBody = queryForSingleArchitectureBody(b2World, clickedb2Space);
			// if (this.selectedBody) {
			// 	// const fixtList = this.selectedBody.GetFixtureList();
			// 	// console.log("occupyingBlock exists");
			// 	// console.log(this.selectedBody);
			// } else {
			// 	this.selectedBody = undefined;
			// 	// console.log(this.selectedBody);
			// }

			// }

			/* CONSOLE LOG to notify of click in client space versus game space */
			// console.log(` Client Space				VS		Game Space			VS		distFromPlayer
			// 		 X: ${mouseClick.clientX}			X: ${clickedb2Space.x}		dist: ${distanceFromPlayer}
			// 		 Y: ${mouseClick.clientY}			Y: ${clickedb2Space.y}`);
		};

		const onDebugMouseUp = (mouseUp: MouseEvent) => {
			this.selectedBody = undefined;
		};

		const onDebugMouseMove = (mouseMove: MouseEvent) => {
			if (this.selectedBody) {
				this.selectedBody.SetLinearVelocity(new Vec2(0.0001, 0));
				// const position: Vec2 = this.selectedBody.GetPosition()
				const mouseInb2Space: Vec2 = this.rayCastConverter!(mouseMove.clientX, mouseMove.clientY);
				this.selectedBody.SetPosition(mouseInb2Space);
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

		for (const pu of this._postUpdates) {
			pu(dt);
		}

		if (this.b2Preview) {
			this.b2Preview.update(dt);
		}

		processDestructions();
		processHUD(dt);
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
