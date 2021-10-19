import { Body, World } from "box2d";
import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { textToPhysicsBodies } from "~/physics/utils/physicsUtils";
import { __pixelPhysicsSize } from "~/settings/constants";
import { fontFaces } from "~/text/FontFace";
import TextMesh from "~/text/TextMesh";
import { textSettings } from "~/text/TextSettings";
import { FPSControls } from "~/utils/fpsControls";
import { getUrlFlag } from "~/utils/location";

import TestPhysicsScene from "./TestPhysics";

export default class TestTextPhysicsScene extends TestPhysicsScene {
	constructor() {
		super();
		const fps = new FPSControls(this.camera as PerspectiveCamera);
		if (getUrlFlag("fpsCam")) {
			fps.toggle(true);
		}

		const testCode = runTextPhysicsTest(this.scene, this.b2World);

		setTimeout(() => {
			testCode.settings.fontFace = fontFaces.GothicA1Black;
		}, 2000);

		const init = async () => {
			//
		};
		init();
	}
	update(dt: number) {
		super.update(dt);
	}
	render(renderer: WebGLRenderer) {
		super.render(renderer);
	}
}

export function runTextPhysicsTest(scene: Scene, b2World: World) {
	let lastKnownTextBodies: Body[] | undefined;

	const s = 10;

	const testCode = new TextMesh(
		[
			"/**",
			"* For the brave souls who get this far: You are the chosen ones,",
			"* the valiant knights of programming who toil away, without rest,",
			"* testCode.scale.multiplyScalar(s)",
			"* testCode.position.z -= 6",
			"* testCode.position.x -= 2",
			"* scene.add(testCode)",
			"* ",
			"* testCode.onMeasurementsUpdated = () => {",
			"*                                            if (lastKnownTextBodies) {",
			"*                                                                                 for (const body of lastKnownTextBodies) {",
			"* }",
			"* lastKnownTextBodies = undefined",
			"* }",
			"* lastKnownTextBodies = textToPhysicsBodies(testCode, b2World)",
			"* }",
			"* return testCode",
			"*/"
		].join("\n"),
		textSettings.code,
		undefined,
		undefined
	);

	testCode.scale.multiplyScalar(s);
	testCode.position.z -= 6;
	testCode.position.x -= 2;
	scene.add(testCode);

	testCode.onMeasurementsUpdated = () => {
		if (lastKnownTextBodies) {
			for (const body of lastKnownTextBodies) {
				getBodyEventManager(b2World).destroyBody(body);
			}
			lastKnownTextBodies = undefined;
		}
		lastKnownTextBodies = textToPhysicsBodies(testCode, b2World);
	};
	return testCode;
}
