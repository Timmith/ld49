import { Body, FixtureDef, PolygonShape, Vec2 } from "box2d";
import { BufferAttribute } from "three";
import { architectureModelFactory } from "~/factories/ArchitectureModelFactory";
import { GLTF_MESH_SCALE } from "~/settings/constants";

import { findCollider } from "./meshColliderUtils";
import { makeBitMask, PBits } from "./physicsUtils";

export async function getArchitectMeshAndFixtures(
	body: Body,
	meshName: string,
	colliderName: string = "collider",
	categoryArray?: PBits[],
	maskArray?: PBits[]
) {
	const mesh = await architectureModelFactory.requestMesh({
		body,
		meshName,
		colliderName,
		addPivot: true,
		categoryArray,
		maskArray
	});
	const collider = findCollider(mesh, colliderName);
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
		const edges = new Set<string>();
		fixtureDef.shape = shape;
		for (let i3 = 0; i3 < indices.length; i3 += 3) {
			const a = indices[i3];
			const b = indices[i3 + 1];
			const c = indices[i3 + 2];
			const ab = a + ":" + b;
			const bc = b + ":" + c;
			const ca = c + ":" + a;
			const ac = a + ":" + c;
			const ba = b + ":" + a;
			const cb = c + ":" + b;
			if (edges.has(ba)) {
				edges.delete(ba);
			} else {
				edges.add(ab);
			}
			if (edges.has(cb)) {
				edges.delete(cb);
			} else {
				edges.add(bc);
			}
			if (edges.has(ac)) {
				edges.delete(ac);
			} else {
				edges.add(ca);
			}
		}
		const edgeMap = new Map<number, number>();
		for (const edge of edges) {
			const edgeData = edge.split(":").map(v => parseInt(v, 10));
			edgeMap.set(edgeData[0], edgeData[1]);
		}
		const loops: number[][] = [];
		while (edgeMap.size > 0) {
			const start = edgeMap.keys().next().value;
			let cursor = edgeMap.get(start)!;
			const loop: number[] = [cursor];
			edgeMap.delete(start);
			do {
				const val = edgeMap.get(cursor)!;
				edgeMap.delete(cursor);
				loop.push(val);
				cursor = val;
			} while (cursor !== start);
			loops.push(loop);
		}
		for (const loop of loops) {
			const positions = loop.map(i => {
				const i3 = i * 3;
				return new Vec2(verts[i3] * GLTF_MESH_SCALE, verts[i3 + 2] * -GLTF_MESH_SCALE);
			});
			shape.Set(positions);
			body.CreateFixture(fixtureDef);
		}
	}
	return mesh;
}
