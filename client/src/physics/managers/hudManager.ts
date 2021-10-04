// import { Body } from "box2d";
import { Color, Mesh } from "three";
import { Player } from "~/helpers/scenes/Testb2World";
import TextMesh from "~/text/TextMesh";
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
// import { removeFromArray } from "~/utils/arrayUtils";

let gui: SimpleGUIOverlay | undefined;
const playerHeartsMap = new Map<Player, Mesh[]>();
const playerTimerBarMap = new Map<Player, Mesh>();
const __heartSpacing: number = 40;

// fullScreenButton

export async function registerHUD(player: Player, passedGUI: SimpleGUIOverlay) {
	gui = passedGUI;
	// HUDBodies.push(playerBody);

	await initializeHealthHUD(player);
	await initializeFullscreenButton();

	const TimerBarMesh = gui.makeTimerBar(0, 0);
	playerTimerBarMap.set(player, TimerBarMesh);

	const timerText = new TextMesh(`${player.currentTimer}`);
	timerText.scale.multiplyScalar(100);
	timerText.opacity = 2;
	TimerBarMesh.add(timerText);

	// const levelText = new TextMesh(`${player.currentLevel + 1}`);
	// levelText.scale.multiplyScalar(100);
	// levelText.opacity = 2;
	// TimerBarMesh.add(levelText);
}

// export function unregisterUserHUD(playerBody: Body) {
// 	removeFromArray(HUDBodies, playerBody);
// }

export function processHUD(dt: number, player: Player) {
	// for (const player of HUDBodies) {

	healthHUDupdate(player);
	const offsetFromLeft = window.innerWidth / 3;

	const timerBarMesh = playerTimerBarMap.get(player);
	if (!timerBarMesh) {
		return;
	}
	const barLengthener = 4;
	const timerRatio = (player.currentTimer / player.maxTimer) * barLengthener;
	timerBarMesh.scale.x = timerRatio * 100;
	timerBarMesh.position.set(
		offsetFromLeft + timerBarMesh.scale.x / 2,
		(gui!._relativeHeightButtonSpacing * 2) / 4,
		0
	);
	timerBarMesh.children[0].scale.x = 4000 / timerBarMesh.scale.x;
	const timeTextOffset = 1;
	timerBarMesh.children[0].position.set(-1 + (timerRatio - timeTextOffset) / timerRatio / 2, 0.05, 0);
	const timerInt = timerBarMesh.children[1] as TextMesh;
	timerInt.scale.x = 4000 / timerBarMesh.scale.x;
	timerInt.position.set(-1 + (timerRatio + timeTextOffset * barLengthener) / timerRatio / 2, 0.05, 0);
	timerInt.text = `${player.currentTimer.toFixed(2)}`;

	// const levelInt = timerBarMesh.children[1] as TextMesh;
	// levelInt.scale.x = 4000 / timerBarMesh.scale.x;
	// levelInt.position.set(-1 + (timerRatio + timeTextOffset * barLengthener) / timerRatio / 2, 0.05, 0);
	// levelInt.text = `${player.currentLevel +1}`;

	// }
}

async function initializeHealthHUD(player: Player) {
	const heartsArray: Mesh[] = [];
	for (let index = 0; index < player.maxHealth; index++) {
		const heartIcon = await gui!.makeWhiteHeartIcon(
			(gui!._narrowerWindowDimension / __heartSpacing) * 0.5 + (index + 1) * __heartSpacing,
			__heartSpacing * 1.25
		);
		heartIcon.material.color.set(new Color(1.2, 0, 0));
		heartsArray.push(heartIcon);
	}
	playerHeartsMap.set(player, heartsArray);
}

function healthHUDupdate(player: Player) {
	const heartsArray = playerHeartsMap.get(player);
	if (!heartsArray) {
		return;
	}
	let index = 0;
	for (const heart of heartsArray) {
		if (index >= player.currentHealth) {
			//@ts-ignore
			heart.material.color.set(0xffffff);
		} else {
			//@ts-ignore
			heart.material.color.set(new Color(1.2, 0, 0));
		}
		heart.position.set(
			(gui!._narrowerWindowDimension / __heartSpacing) * 0.5 + (index + 1) * __heartSpacing,
			__heartSpacing * 1.25,
			0
		);
		index++;
	}
}

async function initializeFullscreenButton() {
	return gui!.makeFullscreenIcon(
		gui!._relativeWidthButtonSpacing,
		window.innerHeight - gui!._relativeHeightButtonSpacing / 2
	);
}
