// import { Body } from "box2d";
import { BufferGeometry, Color, Mesh, MeshBasicMaterial } from "three";
import Player from "~/helpers/Player";
import { __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import TextMesh from "~/text/TextMesh";
import { TextSettings, textSettings } from "~/text/TextSettings";
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
// import { removeFromArray } from "~/utils/arrayUtils";

let gui: SimpleGUIOverlay | undefined;
let hearts: Array<Mesh<BufferGeometry, MeshBasicMaterial>> | undefined;
let timerBar: Mesh | undefined;
let labelBarTime: TextMesh | undefined;
let textTimer: TextMesh | undefined;
let textLevel: TextMesh | undefined;
let textHeight: TextMesh | undefined;

let fullScreenButton: Mesh | undefined;
let hourGlassButton: Mesh | undefined;

const __heartSpacing: number = 40;

// fullScreenButton

export async function registerHUD(player: Player, passedGUI: SimpleGUIOverlay) {
	gui = passedGUI;
	// HUDBodies.push(playerBody);

	await initializeHealthHUD(player);
	initializeLevelTimer(player);

	await initializeFullscreenButton();

	const hourglassButton: Mesh<BufferGeometry, MeshBasicMaterial> = await gui!.makeHourglassIcon(
		window.innerWidth - gui!.relativeButtonSpacingWidth,
		window.innerHeight - gui!.relativeButtonSpacingHeight / 2,
		player
	);

	hourGlassButton = hourglassButton;

	return { hourglassButton };
}

// export function unregisterUserHUD(playerBody: Body) {
// 	removeFromArray(HUDBodies, playerBody);
// }

export function processHUD(dt: number, player: Player) {
	// for (const player of HUDBodies) {

	healthHUDupdate(player);
	fullscreenButtonUpdate();

	const timerRatio = player.currentTimer / player.maxTimer;
	const middleWidth = window.innerWidth * 0.5;
	const barWidth = window.innerWidth * 0.333;
	const leftMargin = (window.innerWidth - barWidth) * 0.5;
	if (timerBar) {
		const size = timerRatio * barWidth;
		timerBar.scale.x = size;
		const barY = 60;
		timerBar.position.set(barWidth + size * 0.5, barY, 0);

		if (labelBarTime) {
			labelBarTime.position.set(leftMargin - 6, barY, 0);
		}
		if (textTimer) {
			textTimer.text = `${player.currentTimer.toFixed(2)}`;
			textTimer.position.set(middleWidth, barY, 0);
		}
		if (textLevel) {
			textLevel.text = `Level: ${player.currentLevel + 1}`;
			textLevel.position.set(middleWidth, barY * 0.35, 0);
		}
		if (textHeight) {
			textHeight.text = `${(player.currentHeight * __PHYSICAL_SCALE_METERS).toFixed(2)}m`;
			textHeight.position.set(middleWidth, window.innerHeight - 30, 0);
		}
	}
	if (gui && hourGlassButton) {
		hourGlassButton.position.set(
			window.innerWidth - gui.relativeButtonSpacingWidth,
			window.innerHeight - gui.relativeButtonSpacingHeight / 2,
			0
		);
	}
}

function makeText(text: string, settings: TextSettings = textSettings.ui) {
	if (!gui) {
		throw new Error("No gui initialized");
	}
	const textMesh = new TextMesh(text, settings);
	textMesh.rotation.x = -Math.PI;
	gui.scene.add(textMesh);
	return textMesh;
}

function initializeLevelTimer(player: Player) {
	if (!gui) {
		throw new Error("No gui initialized");
	}
	timerBar = gui.makeTimerBar(0, 0);

	textTimer = makeText(`${player.currentTimer}`, textSettings.ui);

	labelBarTime = makeText("Time:", { ...textSettings.ui, align: "right" });

	textLevel = makeText(`Level: ${player.currentLevel + 1}`, textSettings.ui);

	textHeight = makeText(`${player.currentHeight}m`, textSettings.height);
}

async function initializeHealthHUD(player: Player) {
	hearts = [];
	for (let index = 0; index < player.maxHealth; index++) {
		const heart = await gui!.makeWhiteHeartIcon(
			(gui!.narrowerWindowDimension / __heartSpacing) * 0.5 + (index + 1) * __heartSpacing,
			__heartSpacing * 1.25
		);
		heart.material.color.set(new Color(1.2, 0, 0));
		hearts.push(heart);
	}
}

function healthHUDupdate(player: Player) {
	if (!hearts) {
		return;
	}
	for (let i = 0; i < hearts.length; i++) {
		const heart = hearts[i];
		if (i >= player.currentHealth) {
			//@ts-ignore
			heart.material.color.set(0xffffff);
		} else {
			heart.material.color.set(new Color(1.2, 0, 0));
		}
		heart.position.set(
			(gui!.narrowerWindowDimension / __heartSpacing) * 0.5 + (i + 1) * __heartSpacing,
			__heartSpacing * 1.25,
			0
		);
	}
}

async function initializeFullscreenButton() {
	fullScreenButton = await gui!.makeFullscreenIcon(
		gui!.relativeButtonSpacingWidth,
		window.innerHeight - gui!.relativeButtonSpacingHeight / 2
	);
}

function fullscreenButtonUpdate() {
	if (!fullScreenButton) {
		return;
	}
	fullScreenButton.position.set(
		gui!.relativeButtonSpacingWidth,
		window.innerHeight - gui!.relativeButtonSpacingHeight / 2,
		0
	);
}
