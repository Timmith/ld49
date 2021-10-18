// import { Body } from "box2d";
import { BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, PlaneBufferGeometry, Texture } from "three";
import device from "~/device";
import Player from "~/helpers/Player";
import { __GIU_Z, __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import TextMesh from "~/text/TextMesh";
import { TextSettings, textSettings } from "~/text/TextSettings";
import SimpleGUIOverlay, { ButtonUserData, ToggleButtonUserData } from "~/ui/SimpleGUIOverlay";
import { getTexture } from "~/utils/textureUtils";

let hud: HUD | undefined;

const __barY = 60;
const __buttonMargin = 42;

const __heartSpacing: number = 40;

const __colorHeartOn = new Color(1.2, 0, 0);
const __colorHeartOff = new Color(1, 1, 1);

let __sharedPlaneGeometry: PlaneBufferGeometry | undefined;
function getSharedUiPlaneGeometry() {
	if (__sharedPlaneGeometry) {
		return __sharedPlaneGeometry;
	} else {
		__sharedPlaneGeometry = new PlaneBufferGeometry(1, 1, 1, 1);
		const positions = __sharedPlaneGeometry.getAttribute("position").array as number[];
		for (let i = 0; i < positions.length; i += 3) {
			positions[i + 1] *= -1;
		}
		return __sharedPlaneGeometry;
	}
}
export class HUD {
	hearts: Array<Mesh<BufferGeometry, MeshBasicMaterial>>;
	timerBar: Mesh;
	labelBarTime: TextMesh;
	textTimer: TextMesh;
	textLevel: TextMesh;
	textHeight: TextMesh;
	labelAnnouncement: TextMesh;

	fullScreenButton: Mesh<BufferGeometry, MeshBasicMaterial>;
	hourGlassButton: Mesh<BufferGeometry, MeshBasicMaterial>;
	barWidth: number = window.innerWidth * 0.3333;

	constructor(
		player: Player,
		passedGUI: SimpleGUIOverlay,
		heartTexture: Texture,
		private _fullscreenEnterButtonTexture: Texture,
		private _fullscreenExitButtonTexture: Texture,
		hourGlassButtonTexture: Texture
	) {
		this.hearts = [];
		const scene = passedGUI.scene;
		const heartIconGeo = getSharedUiPlaneGeometry();
		for (let index = 0; index < player.maxHealth; index++) {
			const material = new MeshBasicMaterial({
				map: heartTexture,
				color: new Color(1.2, 0, 0),
				transparent: true,
				depthWrite: false
			});
			const heart = new Mesh(heartIconGeo, material);
			heart.scale.setScalar(32);
			scene.add(heart);
			this.hearts.push(heart);
		}

		function makeText(text: string, settings: TextSettings = textSettings.ui) {
			const textMesh = new TextMesh(text, settings);
			textMesh.rotation.x = -Math.PI;
			scene.add(textMesh);
			return textMesh;
		}

		this.timerBar = passedGUI.makeTimerBar(0, 0);

		this.textTimer = makeText(`${player.currentTimer}`, textSettings.ui);

		this.labelBarTime = makeText("Time:", { ...textSettings.ui, align: "right" });

		this.textLevel = makeText(`Level: ${player.currentLevel + 1}`, textSettings.ui);

		this.textHeight = makeText(`${player.currentHeight}m`, textSettings.height);

		this.labelAnnouncement = makeText("", textSettings.title);

		this.fullScreenButton = new Mesh(
			getSharedUiPlaneGeometry(),
			new MeshBasicMaterial({ map: _fullscreenEnterButtonTexture, transparent: true })
		);
		this.fullScreenButton.scale.setScalar(64);

		passedGUI.registerButton(this.fullScreenButton);
		const fullscreenData = new ToggleButtonUserData();
		fullscreenData.registerHitCallback(this.toggleFullscreenButton);
		this.fullScreenButton.userData = fullscreenData;
		scene.add(this.fullScreenButton);

		this.hourGlassButton = new Mesh(
			getSharedUiPlaneGeometry(),
			new MeshBasicMaterial({ map: hourGlassButtonTexture, transparent: true, side: DoubleSide })
		);
		this.hourGlassButton.scale.setScalar(64);
		this.hourGlassButton.position.z = 10;

		passedGUI.registerButton(this.hourGlassButton);
		this.hourGlassButton.userData = new ButtonUserData();
		scene.add(this.hourGlassButton);
		device.onChange(this.onResize, true);
	}
	announce(message: string) {
		this.labelAnnouncement.text = message;
	}
	toggleFullscreenButton = (active: boolean) => {
		this.fullScreenButton.material.map = active
			? this._fullscreenExitButtonTexture
			: this._fullscreenEnterButtonTexture;
	};
	update(dt: number, player: Player) {
		for (let i = 0; i < this.hearts.length; i++) {
			const heart = this.hearts[i];
			if (i >= player.currentHealth) {
				heart.material.color.copy(__colorHeartOff);
			} else {
				heart.material.color.copy(__colorHeartOn);
			}
		}

		const timerRatio = player.currentTimer / player.maxTimer;
		const size = timerRatio * this.barWidth;
		this.timerBar.scale.x = size;
		this.timerBar.position.set(this.barWidth + size * 0.5, __barY, 0);
		this.textTimer.text = `${player.currentTimer.toFixed(2)}`;
		this.textLevel.text = `Level: ${player.currentLevel + 1}`;
		this.textHeight.text = `${(player.currentHeight * __PHYSICAL_SCALE_METERS).toFixed(2)}m`;
	}
	onResize = () => {
		const middleWidth = window.innerWidth * 0.5;
		for (let i = 0; i < this.hearts.length; i++) {
			const heart = this.hearts[i];
			heart.position.set((i + 1) * __heartSpacing, __heartSpacing * 1.25, 0);
		}
		this.fullScreenButton.position.set(__buttonMargin, window.innerHeight - __buttonMargin, __GIU_Z);
		this.barWidth = window.innerWidth * 0.333;
		const leftMargin = (window.innerWidth - this.barWidth) * 0.5;
		this.textTimer.position.set(middleWidth, __barY, __GIU_Z);
		this.labelBarTime.position.set(leftMargin - 6, __barY, __GIU_Z);
		this.textLevel.position.set(middleWidth, __barY * 0.35, __GIU_Z);
		this.textHeight.position.set(middleWidth, window.innerHeight - 30, __GIU_Z);
		this.hourGlassButton.position.set(
			window.innerWidth - __buttonMargin,
			window.innerHeight - __buttonMargin,
			__GIU_Z
		);
		this.labelAnnouncement.position.set(window.innerWidth * 0.5, window.innerHeight * 0.5, __GIU_Z);
	};
}

export async function registerHUD(player: Player, passedGUI: SimpleGUIOverlay) {
	const heartIconTexture = await getTexture("game/icons/heart-white.png");
	const fullScreenEnterButtonTexture = await getTexture("game/icons/fullscreen-enter.png");
	const fullScreenExitButtonTexture = await getTexture("game/icons/fullscreen-exit.png");
	const hourGlassButtonTexture = await getTexture("game/icons/hourglass-button.png");

	// const imageAspectRatio = whiteHeartTexture.image.width / whiteHeartTexture.image.height;
	// const geo = new BoxBufferGeometry(this.squareButtonDimensions * imageAspectRatio, this.squareButtonDimensions);
	hud = new HUD(
		player,
		passedGUI,
		heartIconTexture,
		fullScreenEnterButtonTexture,
		fullScreenExitButtonTexture,
		hourGlassButtonTexture
	);

	return hud;
}

// export function unregisterUserHUD(playerBody: Body) {
// 	removeFromArray(HUDBodies, playerBody);
// }

export function processHUD(dt: number, player: Player) {
	if (hud) {
		hud.update(dt, player);
	}
}
