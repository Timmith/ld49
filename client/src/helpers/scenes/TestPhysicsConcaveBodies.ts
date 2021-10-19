import { BodyType } from "box2d";
import { Vector2 } from "three";
import { debugPolygonPhysics } from "~/meshes/Box2DPreviewMesh";
import { makeWobblyCircleShapePath } from "~/misc/shapePaths";
import makePolygonPhysics, {
	createStaticBox,
	deconstructConcavePath2,
	deconstructConcavePath3
} from "~/physics/utils/physicsUtils";

import TestPhysicsScene from "./TestPhysics";

export default class TestConcaveBodiesScene extends TestPhysicsScene {
	protected postUpdates: Array<(dt: number) => void> = [];
	constructor() {
		super(false, 20, false);

		//temporary, so we don't need graphics
		debugPolygonPhysics.value = true;

		for (let i = 0; i < 10; i++) {
			createStaticBox(this.b2World, i - 5, -0.3, 0.5, 0.1);
		}

		const wobblyCircleVerts = makeWobblyCircleShapePath(0.1, 0.25, 40, 6);
		makePolygonPhysics(
			this.b2World,
			undefined,
			wobblyCircleVerts,
			BodyType.b2_staticBody,
			new Vector2(-0.5, 0),
			deconstructConcavePath2
		);

		const testShape = makeWobblyCircleShapePath(0.2, 0.125, 12, 3, 0.25);
		const pos = new Vector2(-1, 0);
		makePolygonPhysics(this.b2World, undefined, testShape, BodyType.b2_staticBody, pos, deconstructConcavePath3);
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
