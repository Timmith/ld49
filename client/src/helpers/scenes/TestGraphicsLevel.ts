import { Fixture, Vec2, World } from "box2d";
import { Mesh, MeshStandardMaterial } from "three";
import getKeyboardInput from "~/input/getKeyboardInput";
import KeyboardInput from "~/input/KeyboardInput";
import { materialLibrary } from "~/materials/library";
import { Box2DPreviewMesh } from "~/meshes/Box2DPreviewMesh";
import { createPhysicBoxFromPixels } from "~/physics/utils/physicsUtils";
import PNGLevel from "~/PNGLevel";
import { __pixelPhysicsSize } from "~/settings/constants";
import { getCachedChamferedBoxGeometry } from "~/utils/geometry";
import { getUrlFlag, getUrlParam } from "~/utils/location";

import ProceduralKeyboardMesh from "../../meshes/ProceduralKeyboardMesh";

import TestLightingScene from "./TestLighting";

export default class TestGraphicsLevelScene extends TestLightingScene {
	protected b2Preview: Box2DPreviewMesh | undefined;
	protected b2World: World;
	protected keyboardInput: KeyboardInput;
	protected keyboardMesh: ProceduralKeyboardMesh;
	protected checkpointBodies: Fixture[] = [];
	constructor(defaultLevel = "test-layout") {
		super(false, false);
		// this.camera.position.y += 1.5
		const b2World = new World(new Vec2(0, -9.8));

		this.b2World = b2World;
		if (getUrlFlag("debugPhysics")) {
			const b2Preview = new Box2DPreviewMesh(b2World);
			this.b2Preview = b2Preview;
			this.scene.add(b2Preview);
		}

		//@ts-ignore
		const pngLevel = new PNGLevel(
			getUrlParam("level") || defaultLevel,
			(x: number, y: number, width: number, height: number, colour: number) => {
				//if block yellow, make physics/sensor properties
				const isSensor = colour === 0xffff00;
				createPhysicBoxFromPixels(b2World, x, y, width, height, isSensor);

				const depth = (width + height) * 0.5;
				if (y + height >= 32) {
					height += 100;
				}
				const mat = materialLibrary.levelMaterial.clone() as MeshStandardMaterial;
				mat.color.setHex(colour);
				const mesh = new Mesh(
					getCachedChamferedBoxGeometry(
						width * __pixelPhysicsSize,
						height * __pixelPhysicsSize,
						depth * __pixelPhysicsSize,
						0.01
					),
					mat
				);
				mesh.receiveShadow = true;
				mesh.castShadow = true;
				mesh.position.set(
					-0.8 + (x - width * 0.5) * __pixelPhysicsSize,
					0.4 - (y + height * 0.5) * __pixelPhysicsSize,
					0
				);
				this.scene.add(mesh);

				const offset = (depth * 0.5 + 1) * __pixelPhysicsSize;
				if (colour === 0xffff00) {
					const copy = mesh.clone();
					copy.position.z -= offset;
					mesh.position.z += offset;
					this.scene.add(copy);
				}
			},
			() => {
				const keyboardMesh = new ProceduralKeyboardMesh();
				const keyboardInput = getKeyboardInput();
				keyboardInput.addListener(keyboardMesh.onKeyCodeEvent);
				keyboardMesh.scale.multiplyScalar(5);
				keyboardMesh.position.set(-0, 0, -0.5);
				this.scene.add(keyboardMesh);
				this.keyboardInput = keyboardInput;
				this.keyboardMesh = keyboardMesh;
			}
		);
	}
	update(dt: number) {
		super.update(dt);
		this.b2World.Step(dt, 10, 4);
		if (this.b2Preview) {
			this.b2Preview.update(dt);
		}
	}
}
