import { Body, Fixture, QueryCallback, Vec2 } from "box2d";

import { translateCategoryBitsToString } from "./physicsUtils";

export class GetBodiesQueryCallBack extends QueryCallback {
	foundBodies: Body[] = [];
	gameSpace: Vec2;

	constructor(clickedb2Space: Vec2 | undefined) {
		super();

		if (clickedb2Space) {
			this.gameSpace = clickedb2Space;
		}
	}

	reset() {
		this.foundBodies.length = 0;
	}

	ReportFixture(fixture: Fixture): boolean {
		this.foundBodies.push(fixture.GetBody());
		return true;
	}

	// if (__queryCallback.foundBodies.length > 0) {
	// 	for (const body of __queryCallback.foundBodies) {
	// 		const pos = body.GetPosition();
	// 		console.log(`detectedBody pos: ${pos.x}x  ${pos.y}y`);
	// 	}
	// }
}

export class SingleEnvironmentBlockQueryCallBack extends QueryCallback {
	environmentBlockBody: Body | undefined;
	clickedGameSpace: Vec2;

	constructor(clickedb2Space: Vec2 | undefined) {
		super();

		if (clickedb2Space) {
			this.clickedGameSpace = clickedb2Space;
		}
	}

	reset() {
		this.environmentBlockBody = undefined;
	}

	ReportFixture(fixture: Fixture): boolean {
		const blockShape = fixture.GetShape();

		const fixture_category = translateCategoryBitsToString(fixture.m_filter.categoryBits);

		// if (fixture.GetBody().GetType() == BodyType.b2_staticBody && fixture_category === "environment")

		if (fixture_category === "environment") {
			// console.log("environmentBlock hit!!");
			const isInside = blockShape.TestPoint(fixture.GetBody().GetTransform(), this.clickedGameSpace);

			if (isInside) {
				this.environmentBlockBody = fixture.GetBody();
				return false;
			}
		}
		return true;
	}
}
