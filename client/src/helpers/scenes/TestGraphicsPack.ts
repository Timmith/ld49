import { Body } from "box2d";
import {
	BufferGeometry,
	Camera,
	Color,
	Material,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Scene,
	SkinnedMesh,
	SphereBufferGeometry,
	Vector3
} from "three";
import { architectureModelFactory } from "~/factories/ArchitectureModelFactory";
import { getBodyEventManager } from "~/physics/managers/bodyEventManager";
import { __tileSize } from "~/settings/constants";
import { removeFromArray } from "~/utils/arrayUtils";
import { COLOR_WHITE } from "~/utils/colorLibrary";
import { getCachedChamferedBoxGeometry } from "~/utils/geometry";

const __cameraOffset = new Vector3(0, 3, 2);
// __cameraOffset.multiplyScalar(0.4);

export default class TestGraphicsPack {
	cursorBody: Body;
	private bodyMeshMap: Map<Body, Mesh> = new Map();
	private _bodiesWaitingForMeshes: Body[] = [];
	private _material: MeshStandardMaterial;
	private _geometry: SphereBufferGeometry;

	constructor(scene: Scene, private _camera: Camera) {
		// if (_camera instanceof PerspectiveCamera) {
		// 	_camera.fov *= 1.5;
		// 	_camera.updateProjectionMatrix();
		// }

		getBodyEventManager().startListeningForCreate(body => {});

		getBodyEventManager().startListeningForDestroy(body => {});
	}

	update(dt: number) {
		this.bodyMeshMap.forEach((mesh, body) => {
			mesh.position.x = body.GetPosition().x;
			mesh.position.z = -body.GetPosition().y;
		});
	}

	private tryAddArchitecture(scene: Scene, body: Body) {
		try {
			architectureModelFactory.init(() => {
				this.addArchitecture(scene, body);
			});
		} catch (error) {
			try {
				this.addArchitecture(scene, body);
			} catch (error) {
				console.log(error);
			}
		}
	}
	private addArchitecture(scene: Scene, body: Body) {
		//@ts-ignore
		const architecture = architectureModelFactory.makeArchitecture(scene, body);
		// if (architecture) {
		// 	this.architecturePuppets.push(architecture);
		// 	this.bodyMeshMap.set(architecture.architectureBody, architecture.mesh);
		// 	this.architectureBody = architecture.architectureBody;
		// }
	}

	private getMaterial(uniqueMaterial = false) {
		if (!this._material) {
			this._material = new MeshStandardMaterial({ color: COLOR_WHITE, roughness: 0.9 });
		}
		if (uniqueMaterial) {
			return this._material.clone() as MeshStandardMaterial;
		}
		return this._material;
	}
}
