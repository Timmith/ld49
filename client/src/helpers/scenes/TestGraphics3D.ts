import { Vec2 } from "box2d";
import { Plane, Vector3, WebGLRenderer } from "three";
import device from "~/device";
import TestGraphicsPack from "~/helpers/scenes/TestGraphicsPack";
import { hitTestPlaneAtPixel } from "~/utils/math";

import Testb2World from "./Testb2World";
import TestLightingScene from "./TestLighting";

export default class TestGraphics3D extends TestLightingScene {
	b2World: Testb2World;
	graphicsPack: TestGraphicsPack;
	constructor() {
		super(false, false);

		this.camera.position.set(0, 0, 5);
		this.camera.lookAt(new Vector3(0, 0, 0));

		const nuPlane = new Plane(new Vector3(0, 0, -1));

		this.b2World = new Testb2World((x, y) => {
			const vec = new Vec2(x, y);
			const result = hitTestPlaneAtPixel(
				(x / device.width) * 2 - 1,
				-((y / device.height) * 2 - 1),
				nuPlane,
				this.camera
			);
			if (result) {
				vec.x = result.x;
				vec.y = result.y;
			}

			return vec;
		});

		this.graphicsPack = new TestGraphicsPack(this.scene);
	}

	update(dt: number) {
		this.b2World.update(dt);
		this.graphicsPack.update(dt);

		super.update(dt);
	}
	render(renderer: WebGLRenderer, dt: number) {
		super.render(renderer, dt);
		this.b2World.ui.render(renderer);
	}
}
