import { Mesh, Object3D } from "three";

export function findCollider(mesh: Object3D, colliderName: string) {
	let collider: Mesh | undefined;
	mesh.traverse(child => {
		if (child instanceof Mesh && child.name.includes(colliderName)) {
			collider = child;
		}
	});
	if (!collider) {
		throw new Error("no collider found");
	}
	return collider;
}
