import { Body } from "box2d";
import { Color, Mesh, Scene, Vector3 } from "three";
import { canvas } from "~/renderer";
import TextMesh from "~/text/TextMesh";
import SimpleGUIOverlay, { ToggleButtonUserData } from "~/ui/SimpleGUIOverlay";
import { removeFromArray } from "~/utils/arrayUtils";

const HUDBodies: Body[] = [];
let gui: SimpleGUIOverlay | undefined;

export async function registerHUD(passedGUI: SimpleGUIOverlay) {
	gui = passedGUI;

	// await initializeFullscreenButton();
}

export function unregisterUserHUD(playerBody: Body) {
	removeFromArray(HUDBodies, playerBody);
}

export function processHUD(dt: number) {
	for (const player of HUDBodies) {
	}
}

async function initializeFullscreenButton() {
	const fullscreenEnterIcon = await gui!.makeFullscreenIcon(
		window.innerWidth - gui!._relativeWidthButtonSpacing,
		gui!._relativeHeightButtonSpacing / 2
	);
}
