import { Mesh } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
let art: Promise<GLTF> | undefined;
export async function getCopyOfArtStage() {
	if (!art) {
		const gltfLoader = new GLTFLoader();
		art = gltfLoader.loadAsync("game/models/art.glb");
	}
	const gltf = await art;

	for (const child of gltf.scene.children) {
		child.traverse(obj => {
			if (obj instanceof Mesh) {
				obj.castShadow = true;
				obj.receiveShadow = true;
			}
		});
	}
	const stage = gltf.scene.clone();
	return stage;
}
