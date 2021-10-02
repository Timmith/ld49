import { Body, BodyDef } from "box2d";
import { b2World } from "box2d/build/dynamics/b2_world";
import { removeFromArray } from "~/utils/arrayUtils";

class BodyEventManager {
	private world: b2World;
	private bodies: Body[] = [];
	private createCallbacks: Array<(body: Body) => void> = [];
	private destroyCallbacks: Array<(body: Body) => void> = [];

	init(world: b2World) {
		if (this.world) {
			throw new Error("cannot initialize twice");
		} else {
			this.world = world;
		}
	}

	createBody(bodyDef: BodyDef) {
		const body = this.world.CreateBody(bodyDef);
		for (const callback of this.createCallbacks) {
			callback(body);
		}
		this.bodies.push(body);
		return body;
	}

	destroyBody(body: Body) {
		removeFromArray(this.bodies, body);
		for (const callback of this.destroyCallbacks) {
			callback(body);
		}
		this.world.DestroyBody(body);
	}

	startListeningForCreate(callback: (body: Body) => void) {
		for (const body of this.bodies) {
			callback(body);
		}
		this.createCallbacks.push(callback);
	}

	startListeningForDestroy(callback: (body: Body) => void) {
		this.destroyCallbacks.push(callback);
	}
}

let bem: BodyEventManager;

export function getBodyEventManager() {
	if (!bem) {
		bem = new BodyEventManager();
	}
	return bem;
}
