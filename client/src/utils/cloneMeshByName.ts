import { Mesh } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export function cloneMeshByName(gltf: GLTF, name: string, recursive = false) {
	let mesh: Mesh | undefined;
	gltf.scene.traverse(node => {
		if (node instanceof Mesh && node.name === name) {
			mesh = node;
		}
	});
	if (mesh) {
		return mesh.clone(recursive) as Mesh;
	} else {
		throw new Error(`Mesh named "${name}" not found in GLTF`);
	}
}
