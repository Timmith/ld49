import { Body, Fixture, RayCastCallback, Vec2 } from "box2d";
import { Camera, Raycaster } from "three";

export class RayCastClosestCallback extends RayCastCallback {
	readonly hitPosition: Vec2 = new Vec2();
	hitBody: Body | null;

	constructor() {
		super();
	}
	reset() {
		this.hitBody = null;
	}
	ReportFixture(fixture: Fixture, point: Vec2, normal: Vec2, fraction: number): number {
		const hitBody = fixture.GetBody();
		const userData = hitBody.GetUserData();
		const bodyType = hitBody.GetType();

		/* CONSOLE LOG */
		// console.log(`Ray detection! @ x:${point.x} & y:${point.y}  with entity health: ${userData.health} `);
		// console.log(userData);
		// console.log(bodyType);

		if (userData) {
			if (fixture.m_isSensor) {
				// console.log("sensor ignored for raycast");

				// By returning -1, we instruct the calling code to ignore this fixture
				// and continue the ray-cast to the next fixture.
				return -1;
			}

			this.hitPosition.Copy(point);
			this.hitBody = hitBody;
		}

		// By returning the current fraction, we instruct the calling code to clip the ray and
		// continue the ray-cast to the next fixture. WARNING: do not assume that fixtures
		// are reported in order. However, by clipping, we can always get the closest fixture.
		if (bodyType === 0) {
			//console.log("wall hit");
		}

		return fraction;
	}
}

export function setRayCasterToCameraInPixels(rayCaster: Raycaster, px: number, py: number, camera: Camera) {
	rayCaster.setFromCamera({ x: (px / window.innerWidth) * 2 - 1, y: -((py / window.innerHeight) * 2 - 1) }, camera);
}
export function setRayCasterToCameraInUV(rayCaster: Raycaster, u: number, v: number, camera: Camera) {
	rayCaster.setFromCamera({ x: u * 2 - 1, y: v * 2 - 1 }, camera);
}
