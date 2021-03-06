import { Camera, Color, Fog, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import device from "~/device";
import { getUrlColor } from "~/utils/location";

const FOV = 35;
const MOBILE_FOV = 35;
export class BaseTestScene {
	autoClear = true;
	protected scene: Scene;
	protected camera: Camera;
	protected bgColor: Color;
	constructor() {
		const scene = new Scene();

		const bgColor: Color = getUrlColor("bgColor", new Color(0xafcfff));
		scene.fog = new Fog(bgColor.getHex(), 0, 60);
		scene.autoUpdate = false;
		scene.matrixAutoUpdate = false;

		const camera = new PerspectiveCamera(device.isMobile ? MOBILE_FOV : FOV, device.aspect, 0.1, 100);

		device.onChange(() => {
			camera.fov = device.isMobile ? MOBILE_FOV : FOV;
			camera.aspect = device.aspect;
			camera.updateProjectionMatrix();
		}, true);

		camera.position.set(0, 3, 3);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();

		scene.add(camera);

		this.scene = scene;
		this.camera = camera;
		this.bgColor = bgColor;
	}

	update(dt: number) {
		this.scene.updateMatrixWorld(false);
	}

	render(renderer: WebGLRenderer) {
		if (this.autoClear) {
			renderer.setClearColor(this.bgColor, 1);
			renderer.clear(true, true, true);
		}
		renderer.render(this.scene, this.camera);
	}
}
