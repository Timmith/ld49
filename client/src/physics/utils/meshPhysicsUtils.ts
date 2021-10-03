import { Body, FixtureDef, PolygonShape, Vec2 } from "box2d";
import { BufferAttribute, Mesh } from "three";
import { architectureModelFactory } from "~/factories/ArchitectureModelFactory";

import { makeBitMask, PBits } from "./physicsUtils";

const __scale = 0.5;
export async function getArchitectMeshAndFixtures(
	body: Body,
	meshName: string,
	colliderName: string = "collider",
	categoryArray?: PBits[],
	maskArray?: PBits[]
) {
	const obj = await architectureModelFactory.requestMesh({
		body,
		meshName,
		addPivot: true,
		categoryArray,
		maskArray
	});
	let mesh: Mesh | undefined;
	obj.traverse(child => {
		if (child instanceof Mesh && child.visible) {
			mesh = child;
		}
	});
	if (!mesh) {
		throw new Error("no mesh found");
	}
	let collider: Mesh | undefined;
	obj.traverse(child => {
		if (child instanceof Mesh && child.name.includes(colliderName)) {
			collider = child;
		}
	});
	if (!collider) {
		throw new Error("no collider found");
	}

	const vertsAttribute = collider.geometry.attributes.position;
	const indicesAttribute = collider.geometry.getIndex();
	const fixtureDef = new FixtureDef();

	if (categoryArray && maskArray) {
		fixtureDef.filter.categoryBits = makeBitMask(categoryArray); // <-- categoryBits: "I am a..."
		fixtureDef.filter.maskBits = makeBitMask(maskArray); // <-- maskBits: "I collide with..."
	}

	fixtureDef.density = 1;
	if (vertsAttribute instanceof BufferAttribute && indicesAttribute instanceof BufferAttribute) {
		const verts = vertsAttribute.array;
		const indices = indicesAttribute.array;
		const shape = new PolygonShape();
		fixtureDef.shape = shape;
		for (let i3 = 0; i3 < indices.length; i3 += 3) {
			const a = indices[i3] * 3;
			const b = indices[i3 + 1] * 3;
			const c = indices[i3 + 2] * 3;
			const positions = [
				new Vec2(verts[b] * __scale, verts[b + 2] * -__scale),
				new Vec2(verts[a] * __scale, verts[a + 2] * -__scale),
				new Vec2(verts[c] * __scale, verts[c + 2] * -__scale)
			];
			shape.Set(positions);
			body.CreateFixture(fixtureDef);
		}
	}
	return mesh;
}
