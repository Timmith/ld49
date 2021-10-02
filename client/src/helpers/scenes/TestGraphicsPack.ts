import { Body } from "box2d";
import { Mesh, Scene } from "three";
import { architectureModelFactory } from "~/factories/ArchitectureModelFactory";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { __tileSize } from "~/settings/constants";

export default class TestGraphicsPack {
	cursorBody: Body;
	private bodyMeshMap: Map<Body, Mesh> = new Map();

	constructor(scene: Scene) {
		getBodyEventManager().startListeningForCreate(async body => {
			const mesh = await architectureModelFactory.requestMesh(body);
			this.bodyMeshMap.set(body, mesh);
			scene.add(mesh);
		});

		getBodyEventManager().startListeningForDestroy(body => {
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
		});
	}
}
