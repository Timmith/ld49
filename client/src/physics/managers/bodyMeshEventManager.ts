import { Body } from "box2d";
import { b2World } from "box2d/build/dynamics/b2_world";
import { Object3D } from "three";

class BodyMeshEventManager {
	private world: b2World;
	private bodiesToMeshes = new Map<Body, Object3D>();
	private createCallbacks: Array<(body: Body, mesh: Object3D) => void> = [];
	private destroyCallbacks: Array<(body: Body, mesh: Object3D) => void> = [];

	init(world: b2World) {
		if (this.world) {
			throw new Error("cannot initialize twice");
		} else {
			this.world = world;
		}
	}

	createBody(body: Body, mesh: Object3D) {
		for (const callback of this.createCallbacks) {
			callback(body, mesh);
		}
		this.bodiesToMeshes.set(body, mesh);
	}

	destroyBody(body: Body) {
		const mesh = this.bodiesToMeshes.get(body)!;
		this.bodiesToMeshes.delete(body);
		for (const callback of this.destroyCallbacks) {
			callback(body, mesh);
		}
		this.world.DestroyBody(body);
	}

	startListeningForCreate(callback: (body: Body, mesh: Object3D) => void) {
		for (const body of Array.from(this.bodiesToMeshes.keys())) {
			callback(body, this.bodiesToMeshes.get(body)!);
		}
		this.createCallbacks.push(callback);
	}

	startListeningForDestroy(callback: (body: Body, mesh: Object3D) => void) {
		this.destroyCallbacks.push(callback);
	}
}

const bmems = new Map<b2World, BodyMeshEventManager>();

export function getBodyMeshEventManager(world: b2World) {
	if (!bmems.has(world)) {
		bmems.set(world, new BodyMeshEventManager());
	}
	return bmems.get(world)!;
}
