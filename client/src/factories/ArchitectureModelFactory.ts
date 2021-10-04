import { Body } from "box2d";
import { Mesh, Object3D } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { findCollider } from "~/physics/utils/meshColliderUtils";
import { PBits } from "~/physics/utils/physicsUtils";
import { GLTF_MESH_SCALE } from "~/settings/constants";
import { cloneMeshByName } from "~/utils/cloneMeshByName";

interface RequestParams {
	body: Body;
	meshName: string;
	colliderName: string;
	addPivot?: boolean;
	categoryArray?: PBits[];
	maskArray?: PBits[];
}

class QueuedParams {
	constructor(public params: RequestParams, public resolve: (obj: Object3D) => void) {
		//
	}
}
class ArchitectureModelFactory {
	private _status: "ready" | "initializing" | "not started" = "not started";
	private _gltf: GLTF;
	private _bodiesPromisedMeshes: Map<Body, QueuedParams> = new Map();
	private _bodyMeshMap: Map<Body, Object3D> = new Map();

	async requestMesh(params: RequestParams) {
		return new Promise<Object3D>(resolve => {
			if (this._status === "ready") {
				resolve(this._makeMesh(params));
			} else {
				this._bodiesPromisedMeshes.set(params.body, new QueuedParams(params, resolve));
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

			const gltf = await gltfLoader.loadAsync("game/models/architecture.glb");
			this._gltf = gltf;
			for (const child of gltf.scene.children) {
				child.traverse(obj => {
					if (obj instanceof Mesh) {
						if (obj.name.includes("collider")) {
							obj.visible = false;
						} else {
							obj.castShadow = true;
							obj.receiveShadow = true;
						}
					}
				});
			}

			this._status = "ready";
			this._bodiesPromisedMeshes.forEach((queuedParams, body) => {
				queuedParams.resolve(this._makeMesh(queuedParams.params));
			});
		} else {
			throw new Error("cannot initialize twice");
		}
	}

	private _makeMesh(params: RequestParams) {
		const mesh = cloneMeshByName(this._gltf, params.meshName);
		const pos = params.body.GetPosition();
		mesh.position.set(pos.x, -pos.y, 0);
		if (params.addPivot) {
			const pivot = new Object3D();
			pivot.add(mesh);
			const collider = findCollider(mesh, params.colliderName);
			for (let i = mesh.children.length; i >= 0; i--) {
				const child = mesh.children[i];
				if (child !== collider) {
					mesh.remove(child);
				}
			}
			collider.updateMatrix();
			const matrix = collider.matrix.clone().invert();
			matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
			pivot.rotateX(Math.PI * 0.5);
			pivot.scale.multiplyScalar(GLTF_MESH_SCALE);
			this._bodyMeshMap.set(params.body, pivot);
			return pivot;
		} else {
			mesh.scale.multiplyScalar(GLTF_MESH_SCALE);
			this._bodyMeshMap.set(params.body, mesh);
			return mesh;
		}
	}
}

export const architectureModelFactory = new ArchitectureModelFactory();
