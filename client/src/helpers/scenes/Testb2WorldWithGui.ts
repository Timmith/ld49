import { Body } from "box2d";
import { BufferGeometry, Color, Mesh, MeshBasicMaterial, WebGLRenderer } from "three";
import { HUD, registerHUD } from "~/physics/managers/hudManager";
import { canvas } from "~/renderer";
import { __INITIAL_LEVEL_DURATION, __LEVEL_DURATION_INCREMENT, __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import SimpleGUIOverlay, { ButtonUserData, ToggleButtonUserData } from "~/ui/SimpleGUIOverlay";
import { COLOR_HOURGLASS_AVAILABLE, COLOR_HOURGLASS_UNAVAILABLE } from "~/utils/colorLibrary";
import { RayCastConverter } from "~/utils/RayCastConverter";

import { GameState } from "../types";

import Testb2World from "./Testb2World";

export default class Testb2WorldWithGui extends Testb2World {
	set state(val: GameState) {
		super.state = val;
		this.colorizeHourglassButton(val === "playing" ? COLOR_HOURGLASS_AVAILABLE : COLOR_HOURGLASS_UNAVAILABLE);
	}

	get state() {
		return super.state;
	}
	gui = new SimpleGUIOverlay();
	hud: HUD | undefined;
	private hourglassButton: Mesh<BufferGeometry, MeshBasicMaterial> | undefined;

	constructor(
		rayCastConverter?: RayCastConverter,
		levelChangeCallback?: (level: number) => void,
		pieceStateChangeCallback?: (body: Body) => void,
		cameraChangeCallback?: (value: number) => void,
		drawDebugPhysics = true
	) {
		super(rayCastConverter, levelChangeCallback, pieceStateChangeCallback, cameraChangeCallback, drawDebugPhysics);

		const initControls = async () => {
			const hud = await registerHUD(this.player, this.gui);
			this.hud = hud;
			if (this.queuedAnnouncement) {
				this.hud.announce(this.queuedAnnouncement);
			}
			this.hourglassButton = hud.hourGlassButton;
			const hourglassButtonUserData = this.hourglassButton.userData;
			if (hourglassButtonUserData instanceof ButtonUserData) {
				hourglassButtonUserData.registerHitCallback(() => {
					if (this.state === "playing") {
						this.player.currentTimer = 0;
					}
				});
			}
			const fullScreenButton = hud.fullScreenButton;
			const fullScreenButtonUserData = fullScreenButton.userData;
			if (fullScreenButtonUserData instanceof ToggleButtonUserData) {
				fullScreenButtonUserData.registerHitCallback(enabled => {
					if (enabled) {
						canvas.requestFullscreen();
					} else {
						document.exitFullscreen();
					}
				});
			}
		};
		initControls();
	}
	changeAnnouncement(message: string) {
		if (this.hud) {
			this.hud.announce(message);
		} else {
			this.queuedAnnouncement = message;
		}
	}
	render(renderer: WebGLRenderer, dt: number) {
		super.render(renderer, dt);
		this.gui.render(renderer);
	}
	protected onCursorStart(x: number, y: number) {
		const buttonHit = this.gui.rayCastForButton(x, y);
		if (!buttonHit) {
			super.onCursorStart(x, y);
		}
	}

	private colorizeHourglassButton(color: Color) {
		if (this.hourglassButton) {
			this.hourglassButton.material.color.copy(color);
		}
	}
}
