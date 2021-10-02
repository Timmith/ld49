import { Bone, Skeleton, SkinnedMesh } from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export function cloneGLTFSkinnedMesh(gltf: GLTF) {
	const clone = {
		animations: gltf.animations,
		scene: gltf.scene.clone(true)
	};

	const skinnedMeshes: { [K: string]: SkinnedMesh } = {};
	const cloneBones: { [K: string]: Bone } = {};
	const cloneSkinnedMeshes: { [K: string]: SkinnedMesh } = {};

	gltf.scene.traverse(node => {
		if (node instanceof SkinnedMesh) {
			skinnedMeshes[node.name] = node;
		}
	});

	clone.scene.traverse(node => {
		if (node instanceof Bone) {
			cloneBones[node.name] = node;
		}

		if (node instanceof SkinnedMesh) {
			cloneSkinnedMeshes[node.name] = node;
		}
	});

	for (const name in skinnedMeshes) {
		if (name in skinnedMeshes) {
			const skinnedMesh = skinnedMeshes[name];
			const skeleton = skinnedMesh.skeleton;
			const cloneSkinnedMesh = cloneSkinnedMeshes[name];

			const orderedCloneBones = [];

			for (const bones of skeleton.bones) {
				const cloneBone = cloneBones[bones.name];
				orderedCloneBones.push(cloneBone);
			}

			cloneSkinnedMesh.bind(new Skeleton(orderedCloneBones, skeleton.boneInverses), cloneSkinnedMesh.matrixWorld);
		}
	}

	return clone;
}
