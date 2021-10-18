import { Mesh, Object3D, PerspectiveCamera, Raycaster, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import device from "~/device";
import TestGraphicsPack from "~/helpers/scenes/TestGraphicsPack";
import LeaderBoard from "~/misc/Leaderboard";
import { __PHYSICAL_SCALE_METERS } from "~/settings/constants";
import GameGUI from "~/ui/GameGUI";
import { AnimatedBool } from "~/utils/AnimatedBool";
import { changeCursor } from "~/utils/cursorUtil";
import { getUrlFlag } from "~/utils/location";

import Testb2World from "./Testb2World";
import TestGraphics3D from "./TestGraphics3D";

export default class FullGame extends TestGraphics3D {
	b2World: Testb2World;
	gui: GameGUI;
	graphicsPack: TestGraphicsPack;
	useB2Preview = getUrlFlag("debugPhysics");
	heightGoal: Object3D | undefined;
	dangerZone: Object3D | undefined;
	leaderBoard: LeaderBoard;
	tvCamera: PerspectiveCamera;
	tweenerForCameraGameOrTV = new AnimatedBool(() => {});

	lookingAtTV = false;

	constructor() {
		super(
			(x: number, y: number) => {
				const button = this.gui.gui.rayCastForButton(x, y);
				if (button) {
					changeCursor("pointer", 1);
				} else if (this.rayCastForLeaderboard(x, y)) {
					changeCursor("pointer", 1);
					return false;
				} else {
					changeCursor(undefined, 1);
				}
				return !button;
			},
			coords => {
				const button = this.gui.gui.rayCastForButton(coords[0], coords[1]);
				if (button) {
					button.hit();
				} else if (this.rayCastForLeaderboard(coords[0], coords[1])) {
					this.lookingAtTV = !this.lookingAtTV;
					this.tweenerForCameraGameOrTV.value = this.lookingAtTV;
					this.gui.gui.overlayActive.value = !this.lookingAtTV;
					this.b2World.paused = this.lookingAtTV;
				}
			}
		);
		this.tvCamera = this.camera.clone() as PerspectiveCamera;

		this.gui = new GameGUI(this.b2World);

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
	update(dt: number) {
		super.update(dt);
		if (this.leaderBoard) {
			this.leaderBoard.update(dt);
		}
	}
	render(renderer: WebGLRenderer, dt: number) {
		super.render(renderer, dt);
		if (this.leaderBoard) {
			this.leaderBoard.render(renderer);
		}
		this.gui.render(renderer, dt);
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
			return false;
		}
		const rayCast = new Raycaster();
		rayCast.setFromCamera(
			{ x: (clientX / window.innerWidth) * 2 - 1, y: -((clientY / window.innerHeight) * 2 - 1) },
			this.camera
		);
		const hitIntersection = rayCast.intersectObject(this.leaderBoard.mesh);
		return hitIntersection.length > 0;
	}
}
