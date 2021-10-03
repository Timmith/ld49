import { Body } from "box2d";
import { Object3D, Scene } from "three";
import { architectureModelFactory } from "~/factories/ArchitectureModelFactory";
import { getBodyMeshEventManager } from "~/physics/managers/bodyMeshEventManager";
import { __tileSize } from "~/settings/constants";

export default class TestGraphicsPack {
	cursorBody: Body;
	bodyMeshMap: Map<Body, Object3D> = new Map();

	constructor(scene: Scene) {
		getBodyMeshEventManager().startListeningForCreate((body, mesh) => {
			scene.add(mesh);
			this.bodyMeshMap.set(body, mesh);
		});

		getBodyMeshEventManager().startListeningForDestroy(body => {
			const mesh = architectureModelFactory.deleteMesh(body);
			if (mesh) {
				scene.remove(mesh);
			}
		});
	}
	update(dt: number) {
		this.bodyMeshMap.forEach((mesh, body) => {
			mesh.position.x = body.GetPosition().x;
			mesh.position.y = body.GetPosition().y;
			mesh.rotation.y = body.GetAngle();
		});
	}
}
