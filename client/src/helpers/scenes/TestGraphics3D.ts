import { Vec2 } from "box2d";
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Plane, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import device from "~/device";
import TestGraphicsPack from "~/helpers/scenes/TestGraphicsPack";
import { Easing } from "~/misc/animation/Easing";
import { simpleTweener } from "~/misc/animation/tweeners";
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
			() => {
				simpleTweener.to({
					target: this.camera.position,
					propertyGoals: { y: this.camera.position.y + 1 },
					easing: Easing.Quartic.InOut,
					duration: 2000
				});
				if (this.heightGoal) {
					simpleTweener.to({
						target: this.heightGoal.position,
						propertyGoals: { y: this.heightGoal.position.y + 1 },
						easing: Easing.Quartic.InOut,
						duration: 2000
					});
				}
				if (this.dangerZone) {
					simpleTweener.to({
						target: this.dangerZone.position,
						propertyGoals: { y: this.dangerZone.position.y + 1 },
						easing: Easing.Quartic.InOut,
						duration: 2000
					});
				}
			},
			() => {
				simpleTweener.to({
					target: this.camera.position,
					propertyGoals: { y: 0 },
					easing: Easing.Quartic.InOut,
					duration: 2000
				});
				if (this.heightGoal) {
					simpleTweener.to({
						target: this.heightGoal.position,
						propertyGoals: { y: -0.25 },
						easing: Easing.Quartic.InOut,
						duration: 2000
					});
				}
				if (this.dangerZone) {
					simpleTweener.to({
						target: this.dangerZone.position,
						propertyGoals: { y: -1.55 },
						easing: Easing.Quartic.InOut,
						duration: 2000
					});
				}
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
			this.heightGoal = stage.getObjectByName("heightGoal");
			this.dangerZone = stage.getObjectByName("dangerZone");
			stage.scale.multiplyScalar(0.1);
			stage.rotation.y += Math.PI;
			stage.position.y -= 1.5;
			this.scene.add(stage);
			if (this.heightGoal) {
				this.heightGoal.scale.multiplyScalar(2);
				this.scene.attach(this.heightGoal);
				this.heightGoal.castShadow = false;
				this.heightGoal.receiveShadow = false;
				this.heightGoal.position.y = -0.25;
			}
			if (this.dangerZone) {
				this.dangerZone.scale.multiplyScalar(2);
				this.scene.attach(this.dangerZone);
				this.dangerZone.position.y = -1.55;
				if (this.dangerZone instanceof Mesh && this.dangerZone.material instanceof MeshStandardMaterial) {
					this.dangerZone.castShadow = false;
					this.dangerZone.receiveShadow = false;
					const map = this.dangerZone.material.map;
					this.dangerZone.material = new MeshBasicMaterial({ map, transparent: true, opacity: 0.5 });
				}
				// dangerZone.position.y += 1
			}
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
}
