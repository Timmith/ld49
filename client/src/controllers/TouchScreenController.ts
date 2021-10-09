import { Vec2 } from "box2d";
import { CircleGeometry, Mesh, MeshBasicMaterial, PlaneBufferGeometry } from "three";
import { canvas } from "~/renderer";
import SimpleGUIOverlay, { ToggleButtonUserData } from "~/ui/SimpleGUIOverlay";

import { Controller } from "./Controller";

export default class TouchScreenController extends Controller {
	desiredMovementVector = new Vec2();
	aim = new Vec2();

	debugMovementBasestCursor: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial> | undefined;
	debugMovementBaseCursor: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial> | undefined;
	debugMovementTracerCursor: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial> | undefined;
	debugMovementBasePosition: Vec2 | undefined;
	debugMovementTracerPosition: Vec2 | undefined;
	debugMovementIdentifier: number | undefined;
	leftSideSecondSuccessiveTap: boolean = false;

	debugAimBasestCursor: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial> | undefined;
	debugAimBaseCursor: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial> | undefined;
	debugAimTracerCursor: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial> | undefined;
	debugAimBasePosition: Vec2 | undefined;
	debugAimTracerPosition: Vec2 | undefined;
	debugAimIdentifier: number | undefined;
	rightSideSecondSuccessiveTap: boolean = false;

	buildModeButton: Mesh<CircleGeometry | PlaneBufferGeometry, MeshBasicMaterial>;
	secondtestButton: Mesh<PlaneBufferGeometry | CircleGeometry, MeshBasicMaterial>;

	buttonScaling: number;

	// TODO
	// setup some meta-functions that translate between the sizing and position of the button,
	// with the screen-pixel-ratio, and how far along window.innerWidth it is
	// including the touch window for it's interaction,
	// between ([(window.innerWidth - relative buttonPosition (from right edge of screen)) - buttonWidth, (window.innerWidth - relative buttonPosition) + buttonWidth]) for x
	// and between ([(window.innerHeight - relative buttonPosition (from bottom edge of screen)) - buttonHeight, window.innerHeight + buttonHeight])

	constructor(ui: SimpleGUIOverlay) {
		super(undefined);
		this.buttonScaling = ui.squareButtonDimensions * 15;

		// TODO
		// make a onSizeChange or within the renderer of the UI,
		// perhaps extend the SimpleUI to convey a TouchScreen specific UI,
		// Top right row (menu) of interactable buttons:
		//		- buildMode
		//		- inventory horizontal slot wheel
		//		- minimap (maybe?)

		// const relativeButtonSizing: number = window.innerWidth / 8;
		// ui._relativeButtonSpacing

		this.buildModeButton = ui.makeSmallSquare(
			window.innerWidth - ui.relativeButtonSpacingWidth,
			ui.relativeButtonSpacingHeight,
			true,
			true
		);

		this.buildModeButton.userData = new ToggleButtonUserData(enabled => {
			if (this.cursorBody) {
				//
			}
		});

		this.secondtestButton = ui.makeSmallSquare(
			window.innerWidth - ui.relativeButtonSpacingWidth - ui.relativeButtonSpacingWidth * 2,
			ui.relativeButtonSpacingHeight,
			true,
			true
		);
		this.secondtestButton.userData = new ToggleButtonUserData(enabled => {
			if (enabled) {
				canvas.requestFullscreen();
				this.secondtestButton.material.opacity = 0.75;
			} else {
				document.exitFullscreen();
				this.secondtestButton.material.opacity = 0.3;
			}
		});

		const onTouchStart = (touchStart: TouchEvent) => {
			touchStart.preventDefault();
			if (this.cursorBody) {
			}
		};

		const onTouchEnd = (touchEnd: TouchEvent) => {
			touchEnd.preventDefault();
			touchEnd.stopPropagation();

			const touches = touchEnd.changedTouches;

			// for (let i = 0; i < touches.length; i++) {
			for (const touch of Array.from(touches)) {
				if (touch.identifier === this.debugMovementIdentifier) {
					if (
						this.debugMovementBaseCursor &&
						this.debugMovementTracerCursor &&
						this.debugMovementBasestCursor
					) {
						ui.removeUI(this.debugMovementBasestCursor);
						ui.removeUI(this.debugMovementBaseCursor);
						ui.removeUI(this.debugMovementTracerCursor);

						this.debugMovementIdentifier = undefined;
					}
				}
				if (touch.identifier === this.debugAimIdentifier) {
					if (this.debugAimBaseCursor && this.debugAimTracerCursor && this.debugAimBasestCursor) {
						ui.removeUI(this.debugAimBasestCursor);
						ui.removeUI(this.debugAimBaseCursor);
						ui.removeUI(this.debugAimTracerCursor);

						this.debugAimIdentifier = undefined;
					}
				}
			}

			this.desiredMovementVector.Set(0, 0);
		};

		const onTouchMove = (touchMove: TouchEvent) => {
			touchMove.preventDefault();
			touchMove.stopPropagation();

			const touches = touchMove.changedTouches;

			// for (let i = 0; i < touches.length; i++) {
			for (const touch of Array.from(touches)) {
				const moveTouchVec = new Vec2(touch.clientX, touch.clientY);

				if (touch.identifier === this.debugMovementIdentifier) {
					if (
						this.debugMovementBaseCursor &&
						this.debugMovementTracerCursor &&
						this.debugMovementBasestCursor
					) {
						ui.setPosition(this.debugMovementTracerCursor, moveTouchVec.x, moveTouchVec.y);

						if (this.debugMovementTracerPosition) {
							this.debugMovementTracerPosition.Set(moveTouchVec.x, moveTouchVec.y);
						}

						if (
							this.debugMovementBasePosition &&
							this.debugMovementTracerPosition &&
							this.debugMovementBasestCursor
						) {
							const tempMovementVector = this.debugMovementTracerPosition
								.Clone()
								.SelfSub(this.debugMovementBasePosition)
								.SelfMul(0.0125);
							tempMovementVector.y *= -1;
							const normalizedTempMovementVector = tempMovementVector.Clone().SelfNormalize();

							const tempMovementVectorLength = tempMovementVector.Length();
							const normalizedTempMovementVectorLength = normalizedTempMovementVector.Length();
							// console.log(tempMovementVectorLength);

							this.desiredMovementVector =
								tempMovementVectorLength > normalizedTempMovementVectorLength
									? normalizedTempMovementVector
									: tempMovementVector;

							// if (tempMovementVectorLength > normalizedTempMovementVectorLength) {
							// 	this.desiredMovementVector = normalizedTempMovementVector;
							// 	// debugger;
							// 	// console.log(`normalizedMovement: ${normalizedTempMovementVector.x}x & ${normalizedTempMovementVector.y}y`);
							// } else {
							// 	this.desiredMovementVector = tempMovementVector;
							// 	// console.log(`tempMovement: ${tempMovementVector.x}x & ${tempMovementVector.y}y`);
							// }
						}
					}
				}

				if (touch.identifier === this.debugAimIdentifier) {
					if (this.debugAimBaseCursor && this.debugAimTracerCursor && this.debugAimBasestCursor) {
						ui.setPosition(this.debugAimTracerCursor, moveTouchVec.x, moveTouchVec.y);

						if (this.debugAimTracerPosition) {
							this.debugAimTracerPosition.Set(moveTouchVec.x, moveTouchVec.y);
						}

						if (this.debugAimBasePosition && this.debugAimTracerPosition) {
							const tempAimVector = this.debugAimTracerPosition
								.Clone()
								.SelfSub(this.debugAimBasePosition)
								.SelfMul(0.0125);
							tempAimVector.y *= -1;

							const normalizedTempAimVector = tempAimVector.Clone().SelfNormalize();

							if (tempAimVector.Length() > normalizedTempAimVector.Length()) {
								// debugger;
								this.aim = normalizedTempAimVector;

								if (this.cursorBody) {
								}
							} else {
							}
						}
					}
				}
			}
		};

		const onTouchCancel = (touchCancel: TouchEvent) => {
			touchCancel.preventDefault();
		};

		document.addEventListener("touchstart", onTouchStart, {
			passive: false
		});
		document.addEventListener("touchend", onTouchEnd, { passive: false });
		document.addEventListener("touchmove", onTouchMove, { passive: false });
		document.addEventListener("touchcancel", onTouchCancel, {
			passive: false
		});
	}
}

let _ti: TouchEvent | undefined;
export function getTouchScreenInput(preventDefault = true) {
	if (!_ti) {
		_ti = new TouchEvent("touchstart");
	}
	return _ti;
}

export function rigToTouchScreen(callback: (controller: TouchEvent) => void) {
	let initd = false;
	window.addEventListener("touchstart", (e: TouchEvent) => {
		if (initd) {
			return;
		}
		initd = true;
		console.log("TouchScreen connected.");
		callback(getTouchScreenInput());
	});
}

// TODO
// add the Bull's Eye aiming mechanism to the right analog,
// where bull's eye is rest/idle
// the first ring, is aiming
// and second, is actioning (whether it be shooting or constructing)
