import {
	BoxBufferGeometry,
	CircleBufferGeometry,
	Mesh,
	MeshBasicMaterial,
	NearestFilter,
	OrthographicCamera,
	Raycaster,
	Scene,
	Texture,
	TextureLoader,
	Vector3,
	WebGLRenderer
} from "three";
import device from "~/device";
import { canvas } from "~/renderer";
import TextMesh from "~/text/TextMesh";
import { removeFromArray } from "~/utils/arrayUtils";

export default class SimpleGUIOverlay {
	_relativeWidthButtonSpacing: number;
	_relativeHeightButtonSpacing: number;
	_narrowerWindowDimension: number = window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight;
	_squareButtonDimensions: number = 2.0;

	private _scene = new Scene();
	private _camera = new OrthographicCamera(0, window.innerWidth, 0, window.innerHeight, -100, 100);

	private _fixedRadius: number = 33.3; // <-- good sizing for thumbs (the analogs) on the screen
	private _uiMeshes: Mesh[] = [];
	private _uiButtonMeshes: Mesh[] = [];
	private _material: MeshBasicMaterial;
	private _geometryBigger: CircleBufferGeometry;
	private _geometryBig: CircleBufferGeometry;
	private _geometryMedium: CircleBufferGeometry;
	private _geometrySmall: CircleBufferGeometry;
	private _geometrySqaureSmall: BoxBufferGeometry;
	private _geometryHealthBar: BoxBufferGeometry;

	private _imageLoader: TextureLoader = new TextureLoader();

	/* Texture Promises */
	private _fullscreenEnterTextureLoading: Promise<Texture> | undefined;
	private _fullscreenExitTextureLoading: Promise<Texture> | undefined;
	private _whiteHeartTextureLoading: Promise<Texture> | undefined;
	private _pistolTextureLoading: Promise<Texture> | undefined;
	private _uziTextureLoading: Promise<Texture> | undefined;
	private _weaponContainerTextureLoading: Promise<Texture> | undefined;

	constructor() {
		this._scene.add(this._camera);

		if (device.orientation === "landscape" && device.isMobile) {
			this._relativeWidthButtonSpacing = window.innerWidth / 18;
			this._relativeHeightButtonSpacing = window.innerHeight / 8;
		} else if (device.orientation === "portrait" && device.isMobile) {
			this._relativeHeightButtonSpacing = window.innerHeight / 18;
			this._relativeWidthButtonSpacing = window.innerWidth / 10;
		} else {
			this._relativeWidthButtonSpacing = window.innerWidth / 18;
			this._relativeHeightButtonSpacing = window.innerHeight / 8;
		}

		device.onChange(() => {
			this._camera.right = window.innerWidth;
			this._camera.bottom = window.innerHeight;
			this._camera.updateProjectionMatrix();

			this._narrowerWindowDimension =
				window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight;

			if (device.orientation === "landscape" && device.isMobile) {
				this._relativeWidthButtonSpacing = window.innerWidth / 18;
				this._relativeHeightButtonSpacing = window.innerHeight / 8;
			} else if (device.orientation === "portrait" && device.isMobile) {
				this._relativeHeightButtonSpacing = window.innerHeight / 18;
				this._relativeWidthButtonSpacing = window.innerWidth / 10;
			} else {
				this._relativeWidthButtonSpacing = window.innerWidth / 18;
				this._relativeHeightButtonSpacing = window.innerHeight / 8;
			}
		}, true);
	}

	rayCastForButton(clientX: number, clientY: number) {
		const rayCast = new Raycaster(new Vector3(clientX, clientY, -100), new Vector3(0, 0, 1), 0, 200);
		const hitIntersection = rayCast.intersectObjects(this._uiButtonMeshes);
		for (const hit of hitIntersection) {
			if (hit.object.userData instanceof ToggleButtonUserData) {
				hit.object.userData.hit();
				return true;
			}
		}
		return false;
	}

	setPosition(mesh: Mesh, x: number, y: number) {
		mesh.position.set(x, y, 0);
	}

	removeUI(mesh: Mesh) {
		this._scene.remove(mesh);
		removeFromArray(this._uiMeshes, mesh);
		return mesh;
	}

	removeButtonUI(mesh: Mesh) {
		this._scene.remove(mesh);
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

		renderer.render(this._scene, this._camera);
	}

	async makeFullscreenIcon(x: number, y: number) {
		const fullscreenEnterTexture = await this.getFullscreenEnterTexture();
		const fullscreenExitTexture = await this.getFullscreenExitTexture();
		const imageAspectRatio = fullscreenEnterTexture.image.width / fullscreenEnterTexture.image.height;
		const geo = new BoxBufferGeometry(
			this._squareButtonDimensions * imageAspectRatio,
			this._squareButtonDimensions
		);
		const mesh = this._makeUI(geo, x, y, true, undefined);
		mesh.material = new MeshBasicMaterial({ map: fullscreenEnterTexture, transparent: true });

		mesh.userData = new ToggleButtonUserData(enabled => {
			if (enabled) {
				canvas.requestFullscreen();
				mesh.material = new MeshBasicMaterial({ map: fullscreenExitTexture, transparent: true });
				// mesh.material.opacity = 0.75;
			} else {
				document.exitFullscreen();
				mesh.material = new MeshBasicMaterial({ map: fullscreenEnterTexture, transparent: true });
				// mesh.material.opacity = 0.3;
			}
		});

		return mesh;
	}

	async makeWhiteHeartIcon(x: number, y: number) {
		const whiteHeartTexture = await this.getWhiteHeartTexture();
		const imageAspectRatio = whiteHeartTexture.image.width / whiteHeartTexture.image.height;
		const geo = new BoxBufferGeometry(
			this._squareButtonDimensions * imageAspectRatio,
			this._squareButtonDimensions
		);
		const mesh = this._makeUI(geo, x, y, undefined, undefined);
		mesh.material = new MeshBasicMaterial({ map: whiteHeartTexture, transparent: true, depthWrite: false });
		mesh.scale.setScalar(16);
		return mesh;
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

	private _makeUI(
		geo: BoxBufferGeometry | CircleBufferGeometry,
		x: number,
		y: number,
		isButton?: boolean,
		uniqueMaterial: boolean = false
	) {
		const mesh = new Mesh(geo, this.getMaterial(uniqueMaterial));
		mesh.position.set(x, y, 0);
		mesh.rotation.x = Math.PI;
		mesh.scale.setScalar(this._fixedRadius);
		this._scene.add(mesh);
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

	private getFullscreenEnterTexture() {
		if (!this._fullscreenEnterTextureLoading) {
			this._fullscreenEnterTextureLoading = this._imageLoader.loadAsync("game/icons/fullscreen-enter.png");
			this._fullscreenEnterTextureLoading.then(tex => {
				tex.minFilter = NearestFilter;
				tex.magFilter = NearestFilter;
			});
		}
		return this._fullscreenEnterTextureLoading;
	}

	private getFullscreenExitTexture() {
		if (!this._fullscreenExitTextureLoading) {
			this._fullscreenExitTextureLoading = this._imageLoader.loadAsync("game/icons/fullscreen-exit.png");
			this._fullscreenExitTextureLoading.then(tex => {
				tex.minFilter = NearestFilter;
				tex.magFilter = NearestFilter;
			});
		}
		return this._fullscreenExitTextureLoading;
	}

	private getWhiteHeartTexture() {
		if (!this._whiteHeartTextureLoading) {
			this._whiteHeartTextureLoading = this._imageLoader.loadAsync("game/icons/heart-white.png");
			this._whiteHeartTextureLoading.then(tex => {
				tex.minFilter = NearestFilter;
				tex.magFilter = NearestFilter;
			});
		}
		return this._whiteHeartTextureLoading;
	}

	private getWeaponContainerTexture() {
		if (!this._weaponContainerTextureLoading) {
			this._weaponContainerTextureLoading = this._imageLoader.loadAsync("game/icons/weapon-container.png");
			this._weaponContainerTextureLoading.then(tex => {
				tex.minFilter = NearestFilter;
				tex.magFilter = NearestFilter;
			});
		}
		return this._weaponContainerTextureLoading;
	}

	private getPistolTexture() {
		if (!this._pistolTextureLoading) {
			this._pistolTextureLoading = this._imageLoader.loadAsync("game/icons/weapon-pistol.png");
			this._pistolTextureLoading.then(tex => {
				tex.minFilter = NearestFilter;
				tex.magFilter = NearestFilter;
			});
		}
		return this._pistolTextureLoading;
	}

	private getUziTexture() {
		if (!this._uziTextureLoading) {
			this._uziTextureLoading = this._imageLoader.loadAsync("game/icons/weapon-uzi.png");
			this._uziTextureLoading.then(tex => {
				tex.minFilter = NearestFilter;
				tex.magFilter = NearestFilter;
			});
		}
		return this._uziTextureLoading;
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
			this._geometrySqaureSmall = new BoxBufferGeometry(
				this._squareButtonDimensions,
				this._squareButtonDimensions
			);
		}
		return this._geometrySqaureSmall;
	}
	private getHealthBarGeometry() {
		if (!this._geometryHealthBar) {
			this._geometryHealthBar = new BoxBufferGeometry(1.0, 1.0);
		}
		return this._geometryHealthBar;
	}
}

export class ToggleButtonUserData {
	enabled = false;

	constructor(private callback: (enabled: boolean) => void) {}

	hit() {
		this.enabled = !this.enabled;
		this.callback(this.enabled);
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
