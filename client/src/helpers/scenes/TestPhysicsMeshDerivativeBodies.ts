import { debugPolygonPhysics } from "~/meshes/Box2DPreviewMesh";
import { getArchitectMeshAndFixtures } from "~/physics/utils/meshPhysicsUtils";
import { createStaticBox } from "~/physics/utils/physicsUtils";

import TestPhysicsScene from "./TestPhysics";

export default class TestPhysicsMeshDerivativeBodiesScene extends TestPhysicsScene {
	protected postUpdates: Array<(dt: number) => void> = [];
	constructor() {
		super(false, 20, false);

		//temporary, so we don't need graphics
		debugPolygonPhysics.value = true;

		for (let i = 0; i < 10; i++) {
			createStaticBox(this.b2World, i - 5, -0.3, 0.5, 0.1);
		}

		const init = async () => {
			const body = this.b2World.CreateBody();
			getArchitectMeshAndFixtures(body, "column1", "collider1");
		};

		init();
	}

	update(dt: number) {
		// if (this.firstCharacter) {
		// 	this.b2Preview.offset.Copy(this.firstCharacter.avatarBody.GetPosition());
		// }
		super.update(dt); //does actual physics
		for (const pu of this.postUpdates) {
			pu(dt);
		}
	}
}
