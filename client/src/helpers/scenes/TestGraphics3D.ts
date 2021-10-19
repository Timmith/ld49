import { Body, Vec2 } from "box2d";
import {
	Color,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	Plane,
	Vector3,
	WebGLRenderer
} from "three";
import device from "~/device";
import TestGraphicsPack from "~/helpers/scenes/TestGraphicsPack";
import { Easing } from "~/misc/animation/Easing";
import { simpleTweener } from "~/misc/animation/tweeners";
import { isArchitectParams } from "~/physics/utils/physicsUtils";
import { __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import { getUrlFlag } from "~/utils/location";
import { hitTestPlaneAtPixel } from "~/utils/math";

import { getCopyOfArtStage } from "../art";
import { getCameraSlideDurationForLevel } from "../utils/getCameraSlideDurationForLevel";

import Testb2World from "./Testb2World";
import TestLightingScene from "./TestLighting";

export default class TestGraphics3D extends TestLightingScene {
	testB2World: Testb2World;
	protected gameCamera: PerspectiveCamera;
	private graphicsPack: TestGraphicsPack;
	private heightGoal: Object3D | undefined;
	private dangerZone: Object3D | undefined;

	constructor(
		cursorClearCheck: (x: number, y: number) => boolean = (x: number, y: number) => true,
		onCursorStart = (coords: [number, number]) => {}
	) {
		super(false, false);
		this.camera.position.set(0, 0, 5);
		this.camera.lookAt(new Vector3(0, 0, 0));
		this.gameCamera = this.camera.clone() as PerspectiveCamera;

		const nuPlane = new Plane(new Vector3(0, 0, -1));

		this.testB2World = new Testb2World(
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
			cursorClearCheck,
			getUrlFlag("debugPysics")
		);
		this.testB2World.onCursorStartEvent.addListener(onCursorStart);
		this.testB2World.onLevelChange.addListener(level => {
			this.levelChangeCallback(level);
		});
		this.testB2World.onPieceStateChange.addListener(body => {
			this.pieceStateChangeCallback(body);
		});
		this.testB2World.onCameraChange.addListener(value => {
			this.cameraChangeCallback(value);
		});
		this.testB2World.autoClear = false;

		this.graphicsPack = new TestGraphicsPack(this.scene, this.testB2World.b2World);

		const initArt = async () => {
			const stage = await getCopyOfArtStage();
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
		this.testB2World.update(dt);
		this.graphicsPack.update(dt);
		this.updateCamera();
		super.update(dt);
	}

	render(renderer: WebGLRenderer) {
		super.render(renderer);
		this.testB2World.render(renderer);
	}

	protected updateCamera() {
		this.camera.position.copy(this.gameCamera.position);
		this.camera.quaternion.copy(this.gameCamera.quaternion);
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
		const duration = this.testB2World.spectatorMode ? getCameraSlideDurationForLevel(level) : 2000;
		simpleTweener.to({
			target: this.gameCamera.position,
			propertyGoals: { y: level },
			easing: Easing.Quartic.InOut,
			duration
		});
		if (this.heightGoal) {
			simpleTweener.to({
				target: this.heightGoal.position,
				propertyGoals: { y: level - 0.25 },
				easing: Easing.Quartic.InOut,
				duration
			});
		}
		if (this.dangerZone) {
			simpleTweener.to({
				target: this.dangerZone.position,
				propertyGoals: { y: level - 1.55 },
				easing: Easing.Quartic.InOut,
				duration
			});
		}
	}

	private cameraChangeCallback(value: number) {
		if (this.gameCamera.position.y + value < 0) {
			simpleTweener.to({
				target: this.gameCamera.position,
				propertyGoals: { y: 0 },
				easing: Easing.Quartic.InOut,
				duration: 500
			});
		} else {
			simpleTweener.to({
				target: this.gameCamera.position,
				propertyGoals: { y: this.gameCamera.position.y + value },
				easing: Easing.Quartic.InOut,
				duration: 500
			});
		}
	}
}
