import {
	CircleBufferGeometry,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	PlaneBufferGeometry,
	Raycaster,
	Scene,
	WebGLRenderer
} from "three";
import device from "~/device";
import { setRayCasterToCameraInPixels } from "~/physics/utils/rayCastUtils";
import { __GIU_Z } from "~/settings/constants";
import { AnimatedBool } from "~/utils/AnimatedBool";
import { removeFromArray } from "~/utils/arrayUtils";
import EventDispatcher from "~/utils/EventDispatcher";
import { lerp } from "~/utils/math";

const __rayCaster = new Raycaster();
export default class SimpleGUIOverlay {
	onOverlayActiveChange = new EventDispatcher<number>();
	overlayActive = new AnimatedBool(amt => {
		this._camera.top = lerp(window.innerHeight * 0.25, 0, amt);
		this._camera.bottom = lerp(window.innerHeight * 0.75, window.innerHeight, amt);
		this._camera.left = lerp(window.innerWidth * 0.25, 0, amt);
		this._camera.right = lerp(window.innerWidth * 0.75, window.innerWidth, amt);
		this._camera.updateProjectionMatrix();
		this.onOverlayActiveChange.dispatch(amt);
	}, true);
	relativeButtonSpacingWidth: number;
	relativeButtonSpacingHeight: number;
	narrowerWindowDimension: number = window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight;
	squareButtonDimensions: number = 2.0;

	scene = new Scene();
	private _camera = new OrthographicCamera(0, window.innerWidth, 0, window.innerHeight, 1, 200);
	private _fixedRadius: number = 33.3; // <-- good sizing for thumbs (the analogs) on the screen
	private _uiMeshes: Mesh[] = [];
	private _uiButtonMeshes: Mesh[] = [];

	/* Materials */
	private _material: MeshBasicMaterial;
	private _geometryBigger: CircleBufferGeometry;
	private _geometryBig: CircleBufferGeometry;
	private _geometryMedium: CircleBufferGeometry;
	private _geometrySmall: CircleBufferGeometry;
	private _geometrySqaureSmall: PlaneBufferGeometry;
	private _geometryTimerBar: PlaneBufferGeometry;

	constructor() {
		this.scene.add(this._camera);

		device.onChange(() => {
			this._camera.right = window.innerWidth;
			this._camera.bottom = window.innerHeight;
			this._camera.updateProjectionMatrix();

			this.narrowerWindowDimension =
				window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight;

			if (device.orientation === "landscape" && device.isMobile) {
				this.relativeButtonSpacingWidth = window.innerWidth / 18;
				this.relativeButtonSpacingHeight = window.innerHeight / 8;
			} else if (device.orientation === "portrait" && device.isMobile) {
				this.relativeButtonSpacingHeight = window.innerHeight / 18;
				this.relativeButtonSpacingWidth = window.innerWidth / 10;
			} else {
				this.relativeButtonSpacingWidth = window.innerWidth / 18;
				this.relativeButtonSpacingHeight = window.innerHeight / 8;
			}
		}, true);
	}

	rayCastForButton(clientX: number, clientY: number) {
		setRayCasterToCameraInPixels(__rayCaster, clientX, clientY, this._camera);
		const hitIntersection = __rayCaster.intersectObjects(this._uiButtonMeshes);
		for (const hit of hitIntersection) {
			if (hit.object.userData instanceof ToggleButtonUserData || hit.object.userData instanceof ButtonUserData) {
				return hit.object.userData;
			}
		}
		return undefined;
	}

	setPosition(mesh: Mesh, x: number, y: number) {
		mesh.position.set(x, y, __GIU_Z);
	}

	removeUI(mesh: Mesh) {
		this.scene.remove(mesh);
		removeFromArray(this._uiMeshes, mesh);
		return mesh;
	}

	removeButtonUI(mesh: Mesh) {
		this.scene.remove(mesh);
		removeFromArray(this._uiButtonMeshes, mesh);
		return mesh;
	}

	render(renderer: WebGLRenderer) {
		// if (device.orientation === "landscape" && device.isMobile) {
		// console.log(this._radius);
		// } else if (device.orientation === "portrait" && device.isMobile) {
		// console.log(this._radius);
		/*Used to find out the relative scaling of the thumb analogs, decided the fixed value of 33.3 was better*/

		// console.log(`window.innerWidth: ${window.innerWidth}, innerHeight ${window.innerHeight}`);

		renderer.render(this.scene, this._camera);
	}

	makeTimerBar(x: number, y: number, isButton?: boolean, uniqueMaterial = true) {
		const timerBar = this._makeUI(this.getTimerBarGeometry(), x, y, isButton, uniqueMaterial);
		timerBar.material.color.set("white");
		timerBar.material.opacity = 0.5;

		return timerBar;
	}

	makeBiggerCircle(x: number, y: number) {
		return this._makeUI(this.getBiggerCircleGeometry(), x, y);
	}
	makeBigCircle(x: number, y: number) {
		return this._makeUI(this.getBigCircleGeometry(), x, y);
	}
	makeMediumCircle(x: number, y: number) {
		return this._makeUI(this.getMediumCircleGeometry(), x, y);
	}
	makeSmallCircle(x: number, y: number) {
		return this._makeUI(this.getSmallCircleGeometry(), x, y);
	}
	makeSmallSquare(x: number, y: number, isButton?: boolean, uniqueMaterial = false) {
		return this._makeUI(this.getSmallSquareGeometry(), x, y, isButton, uniqueMaterial);
	}

	registerButton(mesh: Mesh) {
		this._uiButtonMeshes.push(mesh);
	}

	private _makeUI(
		geo: PlaneBufferGeometry | CircleBufferGeometry | PlaneBufferGeometry,
		x: number,
		y: number,
		isButton?: boolean,
		uniqueMaterial: boolean = false
	) {
		const mesh = new Mesh(geo, this.getMaterial(uniqueMaterial));
		mesh.position.set(x, y, __GIU_Z);
		mesh.rotation.x = Math.PI;
		mesh.scale.setScalar(this._fixedRadius);
		this.scene.add(mesh);
		if (isButton) {
			this._uiButtonMeshes.push(mesh);
		} else {
			this._uiMeshes.push(mesh);
		}
		return mesh;
	}

	private getMaterial(uniqueMaterial = false) {
		if (!this._material) {
			this._material = new MeshBasicMaterial({
				opacity: 0.3,
				transparent: true
			});
		}
		if (uniqueMaterial) {
			return this._material.clone() as MeshBasicMaterial;
		}
		return this._material;
	}

	private getBiggerCircleGeometry() {
		if (!this._geometryBigger) {
			this._geometryBigger = new CircleBufferGeometry(3.5, 32);
		}
		return this._geometryBigger;
	}
	private getBigCircleGeometry() {
		if (!this._geometryBig) {
			this._geometryBig = new CircleBufferGeometry(2.5, 32);
		}
		return this._geometryBig;
	}
	private getMediumCircleGeometry() {
		if (!this._geometryMedium) {
			this._geometryMedium = new CircleBufferGeometry(1, 32);
		}
		return this._geometryMedium;
	}
	private getSmallCircleGeometry() {
		if (!this._geometrySmall) {
			this._geometrySmall = new CircleBufferGeometry(0.5, 32);
		}
		return this._geometrySmall;
	}
	private getSmallSquareGeometry() {
		if (!this._geometrySqaureSmall) {
			this._geometrySqaureSmall = new PlaneBufferGeometry(
				this.squareButtonDimensions,
				this.squareButtonDimensions
			);
		}
		return this._geometrySqaureSmall;
	}

	private getTimerBarGeometry() {
		if (!this._geometryTimerBar) {
			this._geometryTimerBar = new PlaneBufferGeometry(1.0, 1.0);
		}
		return this._geometryTimerBar;
	}
}

export class ToggleButtonUserData {
	enabled = false;
	private callbacks: Array<(enabled: boolean) => void> = [];

	hit() {
		this.enabled = !this.enabled;
		for (const cb of this.callbacks) {
			cb(this.enabled);
		}
	}

	registerHitCallback(callback: (enabled: boolean) => void) {
		this.callbacks.push(callback);
	}
}

export class ButtonUserData {
	private callbacks: Array<() => void> = [];

	hit() {
		for (const cb of this.callbacks) {
			cb();
		}
	}

	registerHitCallback(callback: () => void) {
		this.callbacks.push(callback);
	}
}

export class PushButtonUserData {
	constructor(private callback: () => void) {}

	hit() {
		this.callback();
	}
}

// export class CycleButtonUserData {
// 	index = 0;

// 	constructor(private callback: (index: number) => void) {}

// 	hit() {
// 		this.enabled = !this.enabled;
// 		this.callback(this.enabled);
// 	}
// }
