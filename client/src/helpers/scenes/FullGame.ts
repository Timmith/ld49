import { Event, Intersection, Mesh, Object3D, PerspectiveCamera, Raycaster, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import device from "~/device";
import LeaderBoard from "~/misc/Leaderboard";
import { setRayCasterToCameraInPixels } from "~/physics/utils/rayCastUtils";
import { __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import GameGUI from "~/ui/GameGUI";
import { AnimatedBool } from "~/utils/AnimatedBool";
import { changeCursor } from "~/utils/cursorUtil";

import TestGraphics3D from "./TestGraphics3D";

export default class FullGame extends TestGraphics3D {
	gui: GameGUI;
	leaderBoard: LeaderBoard;
	tvCamera: PerspectiveCamera;
	tweenerForCameraGameOrTV = new AnimatedBool(() => {});

	lookingAtTV = false;

	constructor() {
		super(
			(x: number, y: number) => {
				const button = this.gui.gui.rayCastForButton(x, y);
				let leaderboardHit: Intersection<Object3D<Event>> | undefined;
				if (button) {
					changeCursor("pointer", 2);
				} else if ((leaderboardHit = this.rayCastForLeaderboard(x, y))) {
					if (this.lookingAtTV) {
						changeCursor(undefined, 1);
						if (this.leaderBoard && leaderboardHit.uv) {
							this.leaderBoard.projectCursorMove(leaderboardHit.uv);
						}
					} else {
						changeCursor("pointer", 1);
					}
					return false;
				} else {
					changeCursor(this.lookingAtTV ? "pointer" : undefined, 1);
				}
				if (!button) {
					changeCursor(undefined, 2);
				}
				return !button;
			},
			coords => {
				const button = this.gui.gui.rayCastForButton(coords[0], coords[1]);
				let leaderboardHit: Intersection<Object3D<Event>> | undefined;
				if (button) {
					button.hit();
				} else if ((leaderboardHit = this.rayCastForLeaderboard(coords[0], coords[1]))) {
					if (!this.lookingAtTV) {
						this.setLookingAtTV(true);
					} else if (this.leaderBoard && leaderboardHit.uv) {
						this.leaderBoard.projectCursorStart(leaderboardHit.uv);
					}
				} else if (this.lookingAtTV) {
					this.setLookingAtTV(false);
				}
			}
		);
		this.tvCamera = this.camera.clone() as PerspectiveCamera;

		this.gui = new GameGUI(this.testB2World);

		const initTV = async () => {
			const gltfLoader = new GLTFLoader();
			const gltf = await gltfLoader.loadAsync("game/models/tv.glb");
			for (const child of gltf.scene.children) {
				child.traverse(obj => {
					if (obj instanceof Mesh) {
						obj.castShadow = true;
						obj.receiveShadow = true;
					}
				});
			}
			const stage = gltf.scene;
			stage.scale.multiplyScalar(0.35);
			// stage.rotation.y += Math.PI * -0.4;
			stage.rotation.order = "YXZ";
			stage.rotation.y = Math.PI * 0.2;
			stage.rotation.x = Math.PI * -0.1;
			// stage.position.y -= 1.5;
			this.scene.add(stage);
			// const tv = stage.getObjectByName('tv')! as Mesh
			// tv.material.visible = false
			const leaderBoard = new LeaderBoard(stage.getObjectByName("screen")! as Mesh);
			this.leaderBoard = leaderBoard;
			device.onChange(() => {
				stage.position.set(-0.2 * device.aspect, -0.2, 4);
				this.tvCamera.position.set(0, 0, 1);
				stage.updateMatrixWorld(true);
				this.tvCamera.position.applyMatrix4(stage.matrixWorld);
				this.tvCamera.lookAt(new Vector3().applyMatrix4(stage.matrixWorld));
			}, true);
			// const lbMesh = leaderBoard.mesh;
			// lbMesh.scale.set(0.4, 0.3, 1);
			// lbMesh.scale.multiplyScalar(0.5);
			// device.onChange(() => {
			// 	lbMesh.position.set(-0.2 * device.aspect, -0.2, 4);
			// }, true);
			// lbMesh.rotation.order = "YXZ";
			// lbMesh.rotation.y = Math.PI * 0.2;
			// lbMesh.rotation.x = Math.PI * -0.1;
			// this.scene.add(lbMesh);
		};
		initTV();
	}
	setLookingAtTV(active: boolean) {
		this.lookingAtTV = active;
		this.tweenerForCameraGameOrTV.value = this.lookingAtTV;
		this.gui.gui.overlayActive.value = !this.lookingAtTV;
		this.testB2World.paused = this.lookingAtTV;
	}
	update(dt: number) {
		super.update(dt);
		if (this.leaderBoard) {
			this.leaderBoard.update(dt);
		}
	}
	render(renderer: WebGLRenderer) {
		super.render(renderer);
		if (this.leaderBoard) {
			this.leaderBoard.render(renderer);
		}
		this.gui.render(renderer);
	}
	protected updateCamera() {
		this.camera.position.lerpVectors(
			this.gameCamera.position,
			this.tvCamera.position,
			this.tweenerForCameraGameOrTV.animatedValue
		);
		this.camera.quaternion.slerpQuaternions(
			this.gameCamera.quaternion,
			this.tvCamera.quaternion,
			Math.pow(this.tweenerForCameraGameOrTV.animatedValue, 2)
		);
	}

	private rayCastForLeaderboard(clientX: number, clientY: number) {
		if (!this.leaderBoard) {
			return undefined;
		}
		const rayCast = new Raycaster();
		setRayCasterToCameraInPixels(rayCast, clientX, clientY, this.camera);
		const hitIntersection = rayCast.intersectObject(this.leaderBoard.mesh);
		return hitIntersection.length > 0 ? hitIntersection[0] : undefined;
	}
}
