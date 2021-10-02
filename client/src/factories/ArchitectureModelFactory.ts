import { Body } from "box2d";
import { LoadingManager, Mesh } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { cloneMeshByName } from "~/utils/cloneMeshByName";

class ArchitectureModelFactory {
	private _status: "ready" | "initializing" | "not started" = "not started";
	private _gltf: GLTF;
	private _queuedBodies: Map<Body, (wall: Mesh) => void> = new Map();
	private _bodyMeshMap: Map<Body, Mesh> = new Map();

	makeWall(body: Body, onReady: (wall: Mesh) => void) {
		if (this._status === "ready") {
			const mesh = this._actuallyMakeWall(body);
			this._bodyMeshMap.set(body, mesh);
			onReady(mesh);
		} else {
			this._queuedBodies.set(body, onReady);
			if (this._status === "not started") {
				this.init(() => {});
			}
		}
	}

	unmakeWall(body: Body) {
		if (this._queuedBodies.has(body)) {
			this._queuedBodies.delete(body);
		}
		if (this._bodyMeshMap.has(body)) {
			const mesh = this._bodyMeshMap.get(body);
			this._bodyMeshMap.delete(body);
			return mesh;
		} else {
			return undefined;
		}
	}
	init(callback: () => void) {
		if (this._status === "not started") {
			this._status = "initializing";

			const loadingManager = new LoadingManager();
			const gltfLoader = new GLTFLoader(loadingManager);

			gltfLoader.load(
				"game/models/brick-wall.gltf",
				gltf => {
					this._gltf = gltf;
					for (const child of gltf.scene.children) {
						child.scale.multiplyScalar(0.2);

						child.traverse(obj => {
							if (obj instanceof Mesh) {
								obj.castShadow = true;
								obj.receiveShadow = true;
							}
						});
					}

					this._status = "ready";
					this._queuedBodies.forEach((onReady, body) => {
						onReady(this._actuallyMakeWall(body));
					});
				},
				ev => {
					/* */
				},
				ev => {
					// debugger;
				}
			);
		} else {
			throw new Error("cannot initialize twice");
		}
	}

	private _actuallyMakeWall(body: Body) {
		const mesh = cloneMeshByName(this._gltf, "brick-wall");
		const pos = body.GetPosition();
		mesh.position.set(pos.x, 0, -pos.y);
		this._bodyMeshMap.set(body, mesh);
		return mesh;
	}
}

export const architectureModelFactory = new ArchitectureModelFactory();
