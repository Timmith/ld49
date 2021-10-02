import { Body } from "box2d";
import { Mesh } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { cloneMeshByName } from "~/utils/cloneMeshByName";

class ArchitectureModelFactory {
	private _status: "ready" | "initializing" | "not started" = "not started";
	private _gltf: GLTF;
	private _bodiesPromisedMeshes: Map<Body, (wall: Mesh) => void> = new Map();
	private _bodyMeshMap: Map<Body, Mesh> = new Map();

	async requestMesh(body: Body) {
		return new Promise<Mesh>(resolve => {
			if (this._status === "ready") {
				const mesh = this._makeMesh(body);
				resolve(mesh);
			} else {
				this._bodiesPromisedMeshes.set(body, resolve);
				if (this._status === "not started") {
					this._init();
				}
			}
		});
	}

	deleteMesh(body: Body) {
		if (this._bodiesPromisedMeshes.has(body)) {
			this._bodiesPromisedMeshes.delete(body);
		}
		if (this._bodyMeshMap.has(body)) {
			const mesh = this._bodyMeshMap.get(body);
			this._bodyMeshMap.delete(body);
			return mesh;
		} else {
			return undefined;
		}
	}
	private async _init() {
		if (this._status === "not started") {
			this._status = "initializing";

			const gltfLoader = new GLTFLoader();

			const gltf = await gltfLoader.loadAsync("game/models/columns.glb");
			this._gltf = gltf;
			for (const child of gltf.scene.children) {
				child.traverse(obj => {
					if (obj instanceof Mesh) {
						obj.castShadow = true;
						obj.receiveShadow = true;
					}
				});
			}

			this._status = "ready";
			this._bodiesPromisedMeshes.forEach((resolve, body) => {
				resolve(this._makeMesh(body));
			});
		} else {
			throw new Error("cannot initialize twice");
		}
	}

	private _makeMesh(body: Body) {
		const mesh = cloneMeshByName(this._gltf, "column1");
		const pos = body.GetPosition();
		mesh.position.set(pos.x, -pos.y, 0);
		this._bodyMeshMap.set(body, mesh);
		return mesh;
	}
}

export const architectureModelFactory = new ArchitectureModelFactory();
