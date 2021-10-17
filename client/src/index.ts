import { Clock, Color, Vector3 } from "three";

import { BaseTestScene } from "./helpers/scenes/BaseTestScene";
import Testb2World from "./helpers/scenes/Testb2World";
import Testb2WorldWithGui from "./helpers/scenes/Testb2WorldWithGui";
import TestCharacterControlScene from "./helpers/scenes/TestCharacterControl";
import TestCharacterControlOnTextScene from "./helpers/scenes/TestCharacterControlOnText";
import TestGraphics3D from "./helpers/scenes/TestGraphics3D";
import TestGraphicsCharacterScene from "./helpers/scenes/TestGraphicsCharacter";
import TestGraphicsLevelScene from "./helpers/scenes/TestGraphicsLevel";
import TestKeyboardCharacterScene from "./helpers/scenes/TestKeyboardCharacter";
import TestKeyboardInputScene from "./helpers/scenes/TestKeyboardInput";
import TestLightingScene from "./helpers/scenes/TestLighting";
import TestLitModelsScene from "./helpers/scenes/TestLitModels";
import TestPhysicsScene from "./helpers/scenes/TestPhysics";
import TestPhysicsConcaveBodiesScene from "./helpers/scenes/TestPhysicsConcaveBodies";
import TestPhysicsMeshDerivativeBodiesScene from "./helpers/scenes/TestPhysicsMeshDerivativeBodies";
import TestPhysicsPNGScene from "./helpers/scenes/TestPhysicsPNG";
import TestStencilsScene from "./helpers/scenes/TestStencils";
import TestTextScene from "./helpers/scenes/TestText";
import TestTextPhysicsScene from "./helpers/scenes/TestTextPhysics";
import { simpleTweener } from "./misc/animation/tweeners";
import renderer from "./renderer";
import { timeUniform } from "./uniforms";
import { cameraShaker } from "./utils/cameraShaker";
import { getUrlInt, getUrlParam } from "./utils/location";
import { nextFrameUpdate } from "./utils/onNextFrame";
import { taskTimer } from "./utils/taskTimer";
import UpdateManager from "./utils/UpdateManager";

document.addEventListener("gesturestart", e => e.preventDefault()); // disable zooming on mobile

const clock = new Clock();
renderer.setClearColor(new Color(0x344556), 1.0);
cameraShaker.camera.position.set(0, 0.5, 0.5);
cameraShaker.camera.lookAt(new Vector3());

const testClasses: { [K: string]: any } = {
	characterControl: TestCharacterControlScene,
	characterControlOnText: TestCharacterControlOnTextScene,
	graphicsLevel: TestGraphicsLevelScene,
	graphicsCharacter: TestGraphicsCharacterScene,
	keyboard: TestKeyboardInputScene,
	keyboardCharacter: TestKeyboardCharacterScene,
	lighting: TestLightingScene,
	litModels: TestLitModelsScene,
	physics: TestPhysicsScene,
	textPhysics: TestTextPhysicsScene,
	physicsConcave: TestPhysicsConcaveBodiesScene,
	physicsMeshDerivatives: TestPhysicsMeshDerivativeBodiesScene,
	physicsPNG: TestPhysicsPNGScene,
	stencils: TestStencilsScene,
	text: TestTextScene,
	b2d: Testb2World,
	b2dWithGui: Testb2WorldWithGui,
	graphics3D: TestGraphics3D
};

/* inUrl:[?test=testScenario] selector */
let TestClass: new () => BaseTestScene = TestLightingScene;

const testParam = getUrlParam("test") || "graphics3D";
const targetFPS = getUrlInt("fps", 60, 1, 240);

if (testClasses.hasOwnProperty(testParam)) {
	TestClass = testClasses[testParam];
}
const test: BaseTestScene = new TestClass();

let timePassed = 0;
let timePassedApproved = 0;
const DESIRED_FRAME_DURATION = 1 / targetFPS; // 0.016666 seconds (or 16.666 milliseconds) per frame

function loop() {
	requestAnimationFrame(loop);

	/* Responsible for 60 frame limit, also counts frames skipped */
	const dt = Math.min(clock.getDelta(), 0.1) * simpleTweener.speed;
	timePassed += dt;
	if (timePassed - timePassedApproved > DESIRED_FRAME_DURATION) {
		timePassedApproved += DESIRED_FRAME_DURATION;
	} else {
		return;
	}

	nextFrameUpdate();
	simpleTweener.rafTick();
	UpdateManager.update(DESIRED_FRAME_DURATION);
	taskTimer.update(DESIRED_FRAME_DURATION);
	timeUniform.value += DESIRED_FRAME_DURATION;

	test.update(DESIRED_FRAME_DURATION);
	test.render(renderer, DESIRED_FRAME_DURATION);
}

// Start loop
requestAnimationFrame(loop);
