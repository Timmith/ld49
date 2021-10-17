import { Body, Vec2 } from "box2d";
import { Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Plane, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import device from "~/device";
import TestGraphicsPack from "~/helpers/scenes/TestGraphicsPack";
import { Easing } from "~/misc/animation/Easing";
import { simpleTweener } from "~/misc/animation/tweeners";
import { isArchitectParams } from "~/physics/utils/physicsUtils";
import { getUrlFlag } from "~/utils/location";
import { hitTestPlaneAtPixel } from "~/utils/math";

import Testb2World from "./Testb2World";
import TestLightingScene from "./TestLighting";

export default class TestGraphics3D extends TestLightingScene {
	b2World: Testb2World;
	graphicsPack: TestGraphicsPack;
	useB2Preview = getUrlFlag("debugPhysics");
	heightGoal: Object3D | undefined;
	dangerZone: Object3D | undefined;

	constructor() {
		super(false, false);
		this.camera.position.set(0, 0, 5);
		this.camera.lookAt(new Vector3(0, 0, 0));

		const nuPlane = new Plane(new Vector3(0, 0, -1));

		this.b2World = new Testb2World(
			(x, y) => {
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
			},
			level => {
				this.levelChangeCallback(level);
			},
			body => {
				this.pieceStateChangeCallback(body);
			},
			value => {
				this.cameraChangeCallback(value);
			}
		);
		this.b2World.autoClear = false;

		this.graphicsPack = new TestGraphicsPack(this.scene);

		const initArt = async () => {
			const gltfLoader = new GLTFLoader();
			const gltf = await gltfLoader.loadAsync("game/models/art.glb");
			for (const child of gltf.scene.children) {
				child.traverse(obj => {
					if (obj instanceof Mesh) {
						obj.castShadow = true;
						obj.receiveShadow = true;
					}
				});
			}
			const stage = gltf.scene;
			const heightGoal = stage.getObjectByName("heightGoal");
			const dangerZone = stage.getObjectByName("dangerZone");
			const sky = stage.getObjectByName("sky");
			stage.scale.multiplyScalar(0.1);
			stage.rotation.y += Math.PI;
			stage.position.y -= 1.5;
			this.scene.add(stage);
			if (heightGoal) {
				heightGoal.scale.multiplyScalar(2);
				this.scene.attach(heightGoal);
				heightGoal.castShadow = false;
				heightGoal.receiveShadow = false;
				heightGoal.position.y = -0.25;
			}
			if (dangerZone) {
				dangerZone.scale.multiplyScalar(2);
				this.scene.attach(dangerZone);
				dangerZone.position.y = -1.55;
				if (dangerZone instanceof Mesh && dangerZone.material instanceof MeshStandardMaterial) {
					dangerZone.castShadow = false;
					dangerZone.receiveShadow = false;
					const map = dangerZone.material.map;
					dangerZone.material = new MeshBasicMaterial({ map, transparent: true, opacity: 0.5 });
				}
			}
			if (sky) {
				if (sky instanceof Mesh && sky.material instanceof MeshStandardMaterial) {
					sky.castShadow = false;
					sky.receiveShadow = false;
					const map = sky.material.map;
					const color = new Color(2, 2, 2);
					sky.material = new MeshBasicMaterial({ map, fog: true, color });
				}
			}
			this.heightGoal = heightGoal;
			this.dangerZone = dangerZone;
		};
		initArt();
	}

	update(dt: number) {
		this.b2World.update(dt);
		this.graphicsPack.update(dt);

		super.update(dt);
	}
	render(renderer: WebGLRenderer, dt: number) {
		super.render(renderer, dt);
		if (this.useB2Preview) {
			this.b2World.render(renderer, dt);
		}
		this.b2World.gui.render(renderer);
	}

	private pieceStateChangeCallback(body: Body) {
		const piece = this.graphicsPack.bodyMeshMap.get(body);
		const pieceUserData = body.GetUserData();

		if (piece && isArchitectParams(pieceUserData)) {
			const mesh = piece.getObjectByName(pieceUserData.meshName);

			if (mesh instanceof Mesh && mesh.material instanceof MeshStandardMaterial) {
				const material = mesh.material.clone() as MeshStandardMaterial;

				switch (pieceUserData.state) {
					case "floating":
						material.emissive.setRGB(0.2, 0.15, 0);
						material.color.setRGB(1, 1, 0.8);
						break;
					case "falling":
						material.emissive.setRGB(0.1, 0.1, 0.1);
						material.color.setRGB(0.9, 0.9, 0.9);
						break;
					case "frozen":
						material.emissive.setRGB(0, 0, 0);
						material.color.setRGB(0.6, 0.6, 0.6);
						break;
				}

				mesh.material = material;
			}
		}
	}

	private levelChangeCallback(level: number) {
		simpleTweener.to({
			target: this.camera.position,
			propertyGoals: { y: level },
			easing: Easing.Quartic.InOut,
			duration: 2000
		});
		if (this.heightGoal) {
			simpleTweener.to({
				target: this.heightGoal.position,
				propertyGoals: { y: level - 0.25 },
				easing: Easing.Quartic.InOut,
				duration: 2000
			});
		}
		if (this.dangerZone) {
			simpleTweener.to({
				target: this.dangerZone.position,
				propertyGoals: { y: level - 1.55 },
				easing: Easing.Quartic.InOut,
				duration: 2000
			});
		}
	}

	private cameraChangeCallback(value: number) {
		if (this.camera.position.y + value < 0) {
			simpleTweener.to({
				target: this.camera.position,
				propertyGoals: { y: 0 },
				easing: Easing.Quartic.InOut,
				duration: 500
			});
		} else {
			simpleTweener.to({
				target: this.camera.position,
				propertyGoals: { y: this.camera.position.y + value },
				easing: Easing.Quartic.InOut,
				duration: 500
			});
		}
	}
}
