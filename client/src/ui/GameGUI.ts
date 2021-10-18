import { BufferGeometry, Mesh, MeshBasicMaterial, WebGLRenderer } from "three";
import Testb2World from "~/helpers/scenes/Testb2World";
import { HUD, registerHUD } from "~/physics/managers/hudManager";
import { canvas } from "~/renderer";
import { COLOR_HOURGLASS_AVAILABLE, COLOR_HOURGLASS_UNAVAILABLE } from "~/utils/colorLibrary";

import SimpleGUIOverlay, { ButtonUserData, ToggleButtonUserData } from "./SimpleGUIOverlay";

export default class GameGUI {
	gui = new SimpleGUIOverlay();
	hud: HUD | undefined;

	queuedAnnouncement: string = "";
	private hourglassButton: Mesh<BufferGeometry, MeshBasicMaterial> | undefined;

	constructor(b2World: Testb2World) {
		b2World.onStateChange.addListener(state => {
			if (this.hourglassButton) {
				this.hourglassButton.material.color.copy(
					state === "playing" ? COLOR_HOURGLASS_AVAILABLE : COLOR_HOURGLASS_UNAVAILABLE
				);
			}
		});

		b2World.onAnnouncementChange.addListener(message => {
			if (this.hud) {
				this.hud.announce(message);
			} else {
				this.queuedAnnouncement = message;
			}
		});

		const initGui = async () => {
			const hud = await registerHUD(b2World.player, this.gui);
			this.gui.onOverlayActiveChange.addListener(amt => {
				hud.labelAnnouncement.position.y = window.innerHeight * (0.5 - (1 - amt));
			});
			this.hud = hud;
			if (this.queuedAnnouncement) {
				this.hud.announce(this.queuedAnnouncement);
			}
			this.hourglassButton = hud.hourGlassButton;
			const hourglassButtonUserData = this.hourglassButton.userData;
			if (hourglassButtonUserData instanceof ButtonUserData) {
				hourglassButtonUserData.registerHitCallback(() => {
					if (b2World.state === "playing") {
						b2World.player.currentTimer = 0;
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
		initGui();
	}
	render(renderer: WebGLRenderer, dt: number) {
		this.gui.render(renderer);
	}
}
