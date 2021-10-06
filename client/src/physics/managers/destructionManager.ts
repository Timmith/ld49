import { Body } from "box2d";

import { getBodyEventManager } from "./bodyEventManager";
import { getBodyMeshEventManager } from "./bodyMeshEventManager";

const destructionQueue: Body[] = [];
const destructionQueueClearedCallbacks: Array<() => void> = [];

export function queueDestruction(body: Body) {
	destructionQueue.push(body);
}

export function onDestructionQueueCleared(callback: () => void) {
	destructionQueueClearedCallbacks.push(callback);
}

export function processDestructions() {
	if (destructionQueue.length > 0) {
		for (const body of destructionQueue) {
			destructBody(body);
		}
		destructionQueue.length = 0;
	}
	if (destructionQueueClearedCallbacks.length > 0) {
		for (const cb of destructionQueueClearedCallbacks) {
			cb();
		}
		destructionQueueClearedCallbacks.length = 0;
	}
}

function destructBody(body: Body) {
	try {
		getBodyEventManager().destroyBody(body);
		getBodyMeshEventManager().destroyBody(body);
	} catch (e) {
		console.log(e);
	}
}
