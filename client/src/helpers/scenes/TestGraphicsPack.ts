import { Body, BodyType } from "box2d";
import { Object3D, Scene } from "three";
import { architectureModelFactory } from "~/factories/ArchitectureModelFactory";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { __tileSize } from "~/settings/constants";

export default class TestGraphicsPack {
	cursorBody: Body;
	private bodyMeshMap: Map<Body, Object3D> = new Map();

	constructor(scene: Scene) {
		getBodyEventManager().startListeningForCreate(async body => {
			if (body.GetType() === BodyType.b2_dynamicBody) {
				const mesh = await architectureModelFactory.requestMesh({ body, meshName: "column1" });
				this.bodyMeshMap.set(body, mesh);
				scene.add(mesh);
			}
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
			mesh.rotation.y = body.GetAngle();
		});
	}
}
