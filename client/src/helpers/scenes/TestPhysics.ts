import { Body, Vec2, World } from "box2d";
import { WebGLRenderer } from "three";
import { Box2DPreviewMesh } from "~/meshes/Box2DPreviewMesh";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { createPhysicsCircle, createStaticBox } from "~/physics/utils/physicsUtils";
import { rand } from "~/utils/math";

import { BaseTestScene } from "./BaseTestScene";

export default class TestPhysicsScene extends BaseTestScene {
	protected b2World: World;
	protected b2Preview: Box2DPreviewMesh;
	private circleBodies: Body[] = [];
	constructor(testBox = true, totalEnemies = 20, enemiesSelfCollide = true) {
		super();
		const b2World = new World(new Vec2(0, -9.8));
		getBodyEventManager(b2World).init(b2World);
		const b2Preview = new Box2DPreviewMesh(b2World);

		this.scene.add(b2Preview);
		this.b2World = b2World;
		this.b2Preview = b2Preview;

		for (let i = 0; i < totalEnemies; i++) {
			const circleBody = createPhysicsCircle(
				this.b2World,
				rand(-1, 1),
				1 + rand(-0.2, 0.2),
				0.05,
				enemiesSelfCollide
			);
			this.circleBodies.push(circleBody);
		}

		if (testBox) {
			createStaticBox(this.b2World, 0, -0.3, 1, 0.1);
			createStaticBox(this.b2World, 0.2, 0.3, 1, 0.1);
			const ramp = createStaticBox(this.b2World, 1.8, 0, 1, 0.1);
			ramp.SetAngle(Math.PI * 0.25);
		}
	}
	update(dt: number) {
		super.update(dt);
		this.b2World.Step(dt, 10, 4);
		this.b2Preview.update(dt);
		for (const circleBody of this.circleBodies) {
			const p = circleBody.GetPosition();
			if (p.y < -2) {
				circleBody.SetLinearVelocity(new Vec2(0.0, 0.0));
				circleBody.SetPositionXY(rand(-1, 1), 1 + rand(-0.2, 0.2));
			}
		}
	}
	render(renderer: WebGLRenderer) {
		super.render(renderer);
	}
}
