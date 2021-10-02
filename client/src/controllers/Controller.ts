import { Body } from "box2d";

export class Controller {
	get currentPosition() {
		return this.cursorBody!.GetPosition();

		// TODO
		// instead of an avatarBody, it will be a cursorBody that players manipulate via the various control schemes
	}

	// desiredMovementVector: XY = new Vec2();
	// aim: Vec2 = new Vec2();
	// get aimAngle() {
	// 	return Math.atan2(this.aim.y, this.aim.x);
	// }

	constructor(public cursorBody?: Body) {}
}
