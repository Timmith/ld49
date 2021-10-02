import { Body, Fixture, Vec2 } from "box2d";
import { playWorldSound } from "~/audio/sounds";
import KeyboardInput from "~/input/KeyboardInput";
import { Box2DPreviewMesh } from "~/meshes/Box2DPreviewMesh";
import { queueDestruction } from "~/physics/managers/destructionManager";
import {
	convertTob2Space,
	createImprovedCircularSensor,
	gridifyVectorToZeroPoint2,
	queryForSingleEnvironmentBlock
} from "~/physics/utils/physicsUtils";
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
import { RayCastConverter } from "~/utils/RayCastConverter";
import { taskTimer } from "~/utils/taskTimer";

import { Controller } from "./Controller";

const __diagStrength = Math.cos(Math.PI * 0.25);

export class VirtualAxis {
	up = false;
	down = false;
	left = false;
	right = false;
	constructor() {
		//
	}
	get x() {
		let val = 0;
		if (this.left) {
			val -= 1;
		}
		if (this.right) {
			val += 1;
		}
		if (this.up !== this.down) {
			val *= __diagStrength;
		}
		return val;
	}
	get y() {
		let val = 0;
		if (this.down) {
			val -= 1;
		}
		if (this.up) {
			val += 1;
		}
		if (this.left !== this.right) {
			val *= __diagStrength;
		}
		return val;
	}
}

export default class MouseKeyboardController extends Controller {
	// desiredMovementVector = new VirtualAxis();
	// aim = new Vec2();

	currentMousePosition: Vec2 = new Vec2();
	b2Preview: Box2DPreviewMesh | undefined;

	// aim = new VirtualAxis();

	constructor(
		keyboardInput: KeyboardInput,
		private rayCastConverter: RayCastConverter,
		gui: SimpleGUIOverlay,
		b2Preview: Box2DPreviewMesh
	) {
		super(undefined);
		this.b2Preview = b2Preview;

		// const aim = this.aim;
		// const intent = this.desiredMovementVector;
		keyboardInput.addListener((k, pressed) => {
			switch (k) {
				// case "ArrowUp":
				// 	aim.up = pressed;
				// 	break;
				// case "ArrowDown":
				// 	aim.down = pressed;
				// 	break;
				// case "ArrowLeft":
				// 	aim.left = pressed;
				// 	break;
				// case "ArrowRight":
				// 	aim.right = pressed;
				// 	break;
				case "KeyW":
					// intent.up = pressed;
					break;
				case "KeyS":
					// intent.down = pressed;
					break;
				case "KeyA":
					// intent.left = pressed;
					break;
				case "KeyD":
					// intent.right = pressed;
					break;
				case "Space":
					break;
				case "ShiftLeft":
					break;
				case "KeyB":
					break;
			}
		});

		const onMouseDown = (mouseClick: MouseEvent) => {
			mouseClick.preventDefault();
			mouseClick.stopPropagation();

			const isButtonHit = gui.rayCastForButton(mouseClick.clientX, mouseClick.clientY);
			// const clickedb2Space: Vec2 = this.rayCastConverter!(mouseClick.clientX, mouseClick.clientY);
			const clickedb2Space: Vec2 = convertTob2Space(b2Preview, mouseClick.clientX, mouseClick.clientY);

			if (!this.cursorBody) {
			}
		};

		const onMouseUp = (mouseUp: MouseEvent) => {
			//
		};

		const onMouseMove = (mouseMove: MouseEvent) => {
			if (this.cursorBody) {
				const cursorPosition: Vec2 = this.currentPosition;
			}
		};

		document.addEventListener("mousedown", onMouseDown, false);
		document.addEventListener("mouseup", onMouseUp, false);
		document.addEventListener("mousemove", onMouseMove, false);
	}
}
