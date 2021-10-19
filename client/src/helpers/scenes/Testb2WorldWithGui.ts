import { WebGLRenderer } from "three";
import { __INITIAL_LEVEL_DURATION, __LEVEL_DURATION_INCREMENT, __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import GameGUI from "~/ui/GameGUI";

import Testb2World from "./Testb2World";

export default class Testb2WorldWithGui {
	b2World: Testb2World;
	gui: GameGUI;
	constructor() {
		this.b2World = new Testb2World(undefined, (x: number, y: number) => !this.gui.gui.rayCastForButton(x, y));
		this.gui = new GameGUI(this.b2World);
	}
	update(dt: number) {
		this.b2World.update(dt);
	}
	render(renderer: WebGLRenderer) {
		this.b2World.render(renderer);
		this.gui.render(renderer);
	}
}
