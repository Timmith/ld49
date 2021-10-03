import { Fixture } from "box2d";

import { getBodyEventManager } from "./bodyEventManager";
import { getBodyMeshEventManager } from "./bodyMeshEventManager";

const destructionQueue: Fixture[] = [];

export function queueDestruction(fixt: Fixture) {
	// if (!fixt.GetBody().GetUserData()) {
	// 	throw new Error("Data is null");
	// }

	destructionQueue.push(fixt);
}

export function processDestructions() {
	if (destructionQueue.length > 0) {
		for (const fixt of destructionQueue) {
			destructBody(fixt);
		}

		destructionQueue.length = 0;
	}
}

function destructBody(fixt: Fixture) {
	//console.log("DESTRUCTION!!");
	const body = fixt.GetBody();

	try {
		getBodyEventManager().destroyBody(body);
		getBodyMeshEventManager().destroyBody(body);
	} catch (e) {
		console.log(e);
	}
}
