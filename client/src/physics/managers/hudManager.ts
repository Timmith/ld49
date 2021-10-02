import { Body } from "box2d";
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
import { removeFromArray } from "~/utils/arrayUtils";

const HUDBodies: Body[] = [];
// let gui: SimpleGUIOverlay | undefined;

export async function registerHUD(passedGUI: SimpleGUIOverlay) {
	// gui = passedGUI;
	// await initializeFullscreenButton();
}

export function unregisterUserHUD(playerBody: Body) {
	removeFromArray(HUDBodies, playerBody);
}

export function processHUD(dt: number) {
	// for (const player of HUDBodies) {
	// }
}

// async function initializeFullscreenButton() {
// 	return gui!.makeFullscreenIcon(
// 		window.innerWidth - gui!._relativeWidthButtonSpacing,
// 		gui!._relativeHeightButtonSpacing / 2
// 	);
// }
