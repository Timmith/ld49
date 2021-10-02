import { createPhysicBoxFromPixels } from "~/physics/utils/physicsUtils";
import PNGLevel from "~/PNGLevel";
import { getUrlParam } from "~/utils/location";

import TestPhysicsScene from "./TestPhysics";

export default class TestPhysicsPNGScene extends TestPhysicsScene {
	constructor(defaultLevel = "test", totalBalls = 20, onLevelReady: () => void) {
		super(false, totalBalls);
		//@ts-ignore
		const pngLevel = new PNGLevel(
			getUrlParam("level") || defaultLevel,
			createPhysicBoxFromPixels.bind(this, this.b2World),
			onLevelReady
		);
	}
}
