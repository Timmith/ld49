import { Body } from "box2d";
import { b2World } from "box2d/build/dynamics/b2_world";

import { getBodyEventManager } from "./bodyEventManager";
import { getBodyMeshEventManager } from "./bodyMeshEventManager";

class BodyDestructionManager {
	private world: b2World;
	private destructionQueue: Body[] = [];
	private destructionQueueClearedCallbacks: Array<() => void> = [];

	init(world: b2World) {
		if (this.world) {
			throw new Error("cannot initialize twice");
		} else {
			this.world = world;
		}
	}

	queueDestruction(body: Body) {
		this.destructionQueue.push(body);
	}

	onDestructionQueueCleared(callback: () => void) {
		this.destructionQueueClearedCallbacks.push(callback);
	}

	processDestructions() {
		if (this.destructionQueue.length > 0) {
			for (const body of this.destructionQueue) {
				this.destructBody(body);
			}
			this.destructionQueue.length = 0;
		}
		if (this.destructionQueueClearedCallbacks.length > 0) {
			for (const cb of this.destructionQueueClearedCallbacks) {
				cb();
			}
			this.destructionQueueClearedCallbacks.length = 0;
		}
	}

	destructBody(body: Body) {
		try {
			getBodyEventManager(this.world).destroyBody(body);
			getBodyMeshEventManager(this.world).destroyBody(body);
		} catch (e) {
			console.log(e);
		}
	}
}

const bdms = new Map<b2World, BodyDestructionManager>();

export function getBodyDestructionManager(world: b2World) {
	if (!bdms.has(world)) {
		bdms.set(world, new BodyDestructionManager());
	}
	return bdms.get(world)!;
}
