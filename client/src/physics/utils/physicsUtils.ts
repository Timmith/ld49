import {
	AABB,
	Body,
	BodyDef,
	BodyType,
	CircleShape,
	Contact,
	Fixture,
	FixtureDef,
	PolygonShape,
	Vec2,
	World
} from "box2d";
import { b2Body } from "box2d/build/dynamics/b2_body";
import { BufferGeometry, Vector2 } from "three";
import device from "~/device";
import { Box2DPreviewMesh, debugViewScale } from "~/meshes/Box2DPreviewMesh";
import { __pixelPhysicsSize, __tileSize } from "~/settings/constants";
import TextMesh from "~/text/TextMesh";

import { getArrNext, getArrWrap } from "../../utils/arrayUtils";
import { wrap } from "../../utils/math";
import { getBodyEventManager } from "../managers/bodyEventManager";
import { getBodyMeshEventManager } from "../managers/bodyMeshEventManager";

import { getArchitectMeshAndFixtures } from "./meshPhysicsUtils";
import { SingleArchitectureBodyQueryCallBack, SingleEnvironmentBlockQueryCallBack } from "./queryUtils";

export function createPhysicBoxFromPixels(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
	isSensor = false
) {
	const offsetX = -16;
	const offsetY = 8;
	createStaticBox(
		world,
		(x + offsetX - width * 0.5) * __pixelPhysicsSize,
		(-y + offsetY - height * 0.5) * __pixelPhysicsSize,
		width * __pixelPhysicsSize,
		height * __pixelPhysicsSize,
		BodyType.b2_staticBody,
		undefined,
		undefined,
		isSensor
	);
}

export function createStaticBox(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
	bodyType: BodyType = BodyType.b2_staticBody,
	friction = 0.1,
	density = 1,
	isSensor = false
) {
	const bodyDef = new BodyDef();
	const fixtureDef = new FixtureDef();
	bodyDef.fixedRotation = false;
	bodyDef.type = bodyType;
	const boxBody = getBodyEventManager().createBody(bodyDef);
	boxBody.SetPositionXY(x, y);
	fixtureDef.friction = friction;
	fixtureDef.restitution = 0.7;
	fixtureDef.density = density;
	fixtureDef.isSensor = isSensor;
	if (bodyType === BodyType.b2_staticBody) {
		fixtureDef.filter.categoryBits = makeBitMask(["environment"]);
	}
	const templateRect = new PolygonShape().SetAsBox(width * 0.5, height * 0.5);
	fixtureDef.shape = templateRect;
	boxBody.CreateFixture(fixtureDef);
	return boxBody;
}

export function createSensorBox(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
	categoryArray?: PBits[],
	maskArray?: PBits[],
	bodyType: BodyType = BodyType.b2_staticBody,
	friction = 0.1,
	density = 1,
	isSensor = true,
	entityData?: any
) {
	const bodyDef = new BodyDef();
	const fixtureDef = new FixtureDef();
	bodyDef.fixedRotation = false;
	bodyDef.type = bodyType;

	bodyDef.userData = entityData;
	const boxBody = getBodyEventManager().createBody(bodyDef);

	boxBody.SetPositionXY(x, y);
	fixtureDef.friction = friction;
	fixtureDef.restitution = 0.7;
	fixtureDef.density = density;
	fixtureDef.isSensor = isSensor;

	if (categoryArray && maskArray) {
		fixtureDef.filter.categoryBits = makeBitMask(categoryArray); // <-- categoryBits: "I am a..."
		fixtureDef.filter.maskBits = makeBitMask(maskArray); // <-- maskBits: "I collide with..."
	}

	const templateRect = new PolygonShape().SetAsBox(width * 0.5, height * 0.5);
	fixtureDef.shape = templateRect;
	boxBody.CreateFixture(fixtureDef);
	return boxBody;
}

export function createDynamicBox(
	world: World,
	x: number,
	y: number,
	width: number,
	height: number,
	categoryArray?: PBits[],
	maskArray?: PBits[],
	entityData?: any,
	bodyType: BodyType = BodyType.b2_dynamicBody,
	friction = 0.2,
	density = 1,
	isSensor = false
) {
	const bodyDef = new BodyDef();
	const fixtureDef = new FixtureDef();
	bodyDef.fixedRotation = false;
	bodyDef.type = bodyType;

	bodyDef.userData = entityData;
	const boxBody = getBodyEventManager().createBody(bodyDef);

	boxBody.SetPositionXY(x, y);
	fixtureDef.friction = friction;
	fixtureDef.restitution = 0.7;
	fixtureDef.density = density;
	fixtureDef.isSensor = isSensor;

	if (categoryArray && maskArray) {
		fixtureDef.filter.categoryBits = makeBitMask(categoryArray); // <-- categoryBits: "I am a..."
		fixtureDef.filter.maskBits = makeBitMask(maskArray); // <-- maskBits: "I collide with..."
	}

	const templateRect = new PolygonShape().SetAsBox(width * 0.5, height * 0.5);
	fixtureDef.shape = templateRect;
	boxBody.CreateFixture(fixtureDef);
	return boxBody;
}

export interface ArchitectParams {
	floating: boolean;
	x: number;
	y: number;
	angle: number;
	meshName: string;
	colliderName?: string;
	categoryArray?: PBits[];
	maskArray?: PBits[];
	bodyType?: BodyType;
}

export function isArchitectParams(params: any): params is ArchitectParams {
	if (!params) {
		return false;
	}
	if (typeof params !== "object") {
		return false;
	}
	if (typeof params.x !== "number") {
		return false;
	}
	if (typeof params.y !== "number") {
		return false;
	}
	if (typeof params.angle !== "number") {
		return false;
	}
	if (typeof params.floating !== "boolean") {
		return false;
	}
	if (typeof params.meshName !== "string") {
		return false;
	}
	if (params.colliderName !== undefined && typeof params.colliderName !== "string") {
		return false;
	}
	// categoryArray?
	// maskArray?
	// bodyType?
	return true;
}

export async function createArchitectMeshAndFixtures(params: ArchitectParams) {
	const bodyDef = new BodyDef();
	bodyDef.fixedRotation = false;
	bodyDef.type = params.bodyType ?? BodyType.b2_dynamicBody;
	bodyDef.userData = params;

	const body = getBodyEventManager().createBody(bodyDef);
	body.SetPositionXY(params.x, params.y);
	body.SetAngle(params.angle);

	const mesh = await getArchitectMeshAndFixtures(
		body,
		params.meshName,
		params.colliderName ?? "collider",
		params.categoryArray,
		params.maskArray
	);

	getBodyMeshEventManager().createBody(body, mesh);

	return { body, mesh };
}

export type SensorCallback = (sensor: Fixture, rigidBody: Fixture) => void;

export class ContactPair {
	sensor: Fixture;
	rigidBody: Fixture;
	set(sensor: Fixture, rigidBody: Fixture) {
		this.sensor = sensor;
		this.rigidBody = rigidBody;
		return this;
	}
}

const __sharedContactPair = new ContactPair();

export function getContactBetweenSensorAndRigidBody(contact: Contact) {
	const fixtureA = contact.GetFixtureA();
	const fixtureB = contact.GetFixtureB();

	// //make sure only one of the fixtures was a sensor
	if (fixtureA.m_isSensor === fixtureB.m_isSensor) {
		return;
	}

	if (fixtureA.m_isSensor) {
		return __sharedContactPair.set(fixtureA, fixtureB);
	} else {
		return __sharedContactPair.set(fixtureB, fixtureA);
	}
}

const __tempVec = new Vector2();
export function deconstructConcavePath(verts: Vector2[]) {
	const chunks: Vector2[][] = [];
	let unsatisfied: Vector2[];
	let limit = 5;
	do {
		unsatisfied = [];
		limit--;
		let chunk: Vector2[] = [];
		for (let i = 0; i < verts.length; i++) {
			const a = getArrWrap(verts, i - 1);
			const b = getArrWrap(verts, i);
			const c = getArrWrap(verts, i + 1);
			const angle = __tempVec.subVectors(a, b).angle();
			const angle2 = __tempVec.subVectors(b, c).angle();
			const delta = wrap(angle2 - angle, -Math.PI, Math.PI);
			if (delta >= 0) {
				chunk.push(a, b, c);
			} else {
				unsatisfied.push(b);
				chunks.push(chunk);
				chunk = [b];
			}
		}
		chunks.push(chunk);
		verts = unsatisfied;
	} while (unsatisfied.length > 3 && limit > 0);

	return chunks.map(verts => Array.from(new Set(verts))).filter(verts => verts.length >= 3);
}

class AngledVec2 {
	constructor(public vec: Vector2, public angle: number) {
		//
	}
}

function updateAngle(b: AngledVec2, collection: Vector2[]) {
	const i = collection.indexOf(b.vec);
	const a = getArrWrap(collection, i - 1);
	const c = getArrWrap(collection, i + 1);
	updateAngledVec(b, a, c);
	return b;
}

function updateAngledVec(av: AngledVec2, prev: Vector2, next: Vector2) {
	const angle = __tempVec.subVectors(prev, av.vec).angle();
	const angle2 = __tempVec.subVectors(av.vec, next).angle();
	av.angle = wrap(angle2 - angle, -Math.PI, Math.PI);
}

export function deconstructConcavePath2(verts: Vector2[]) {
	const chunks: Vector2[][] = [];
	const unsatisfied = verts.slice();
	const angles: AngledVec2[] = verts.map(v => updateAngle(new AngledVec2(v, 0), unsatisfied));
	while (unsatisfied.length >= 3) {
		angles.sort((a, b) => b.angle - a.angle);
		const best = angles.shift()!;
		const i = unsatisfied.indexOf(best.vec);
		const chunk = [getArrWrap(unsatisfied, i - 1), best.vec, getArrWrap(unsatisfied, i + 1)];
		unsatisfied.splice(i, 1);
		for (const a of angles) {
			if (chunk.indexOf(a.vec) !== -1) {
				updateAngle(a, unsatisfied);
			}
		}
		chunks.push(chunk);
	}
	// chunks.push(unsatisfied)

	return chunks.map(verts => Array.from(new Set(verts))).filter(verts => verts.length >= 3);
}

class Edge {
	constructor(public v1: Vector2, public v2: Vector2) {
		//
	}
}

export function deconstructConcavePath3(verts: Vector2[]) {
	const loops = deconstructConcavePath2(verts);
	console.warn("Not done yet.");
	// const angleLoops: AngledVec2[][] = loops.map(verts => {
	//   return verts.map(v => {
	//     return updateAngle(new AngledVec2(v, 0), verts)
	//   })
	// })
	const edges = new Map<string, Edge>();
	function findOrSet(id: string, edge: Edge) {
		if (edges.has(id)) {
			return edges.get(id);
		} else {
			edges.set(id, edge);
			return undefined;
		}
	}
	for (const loop of loops) {
		for (const v1 of loop) {
			const v2 = getArrNext(loop, v1);
			const id1 = verts.indexOf(v1);
			const id2 = verts.indexOf(v2);
			let other: Edge | undefined;

			other =
				id1 < id2 ? findOrSet(id1 + "-" + id2, new Edge(v1, v2)) : findOrSet(id2 + "-" + id1, new Edge(v2, v1));

			// if (id1 < id2) {
			// 	other = findOrSet(id1 + "-" + id2, new Edge(v1, v2));
			// } else {
			// 	other = findOrSet(id2 + "-" + id1, new Edge(v2, v1));
			// }

			if (other) {
				//WIP
			}
		}
	}
	return loops;
}

const __origin = new Vector2();
export default function makePolygonPhysics(
	body: Body | undefined,
	verts: Vector2[],
	type: BodyType = BodyType.b2_staticBody,
	position = __origin,
	deconstructConcavePathMethod = deconstructConcavePath
) {
	const bodyDef = new BodyDef();
	bodyDef.type = type;
	if (!body) {
		body = getBodyEventManager().createBody(bodyDef);
	}
	body.SetPositionXY(position.x, position.y);
	const subVerts2 = deconstructConcavePathMethod(verts);
	for (const subVerts of subVerts2) {
		if (subVerts.length < 3) {
			continue;
		}
		const fixtureDef = new FixtureDef();
		const shape = new PolygonShape();
		shape.Set(subVerts);
		fixtureDef.shape = shape;
		fixtureDef.filter.categoryBits = makeBitMask(["environment"]);
		body.CreateFixture(fixtureDef);
	}
	return body;
}

export function textToPhysicsBodies(mesh: TextMesh, world: World) {
	const VERTICAL_TEXT_PHYSICS_SCALE = 6.5;
	const HORIZONTAL_TEXT_PHYSICS_SCALE = 5.275;
	const HORIZONTAL_TRANSLATION = -0.1;
	const bodies: Body[] = [];
	if (mesh.geometry instanceof BufferGeometry) {
		const verts = mesh.geometry.attributes.position.array;
		const leap = mesh.geometry.attributes.position.itemSize * 4;
		const pos = mesh.position;
		for (let i = 0; i < verts.length; i += leap) {
			const l = verts[i + 0];
			const r = verts[i + 4];
			const t = verts[i + 1];
			const b = verts[i + 3];
			const bx: number = (l + r) / 2 + pos.x * __pixelPhysicsSize + HORIZONTAL_TRANSLATION;
			const by: number = (t + b) / 2 + pos.y * __pixelPhysicsSize;
			const bwidth: number = r - l;
			const bheight: number = t - b;

			const body = createStaticBox(
				world,
				bx * HORIZONTAL_TEXT_PHYSICS_SCALE,
				by * HORIZONTAL_TEXT_PHYSICS_SCALE,
				bwidth * HORIZONTAL_TEXT_PHYSICS_SCALE,
				bheight * VERTICAL_TEXT_PHYSICS_SCALE
			);
			bodies.push(body);
		}
	}
	return bodies;
}

export function convertTob2Space(b2Preview: Box2DPreviewMesh, xPixel: number, yPixel: number) {
	const result: Vec2 = new Vec2();
	const x = ((xPixel / device.width) * 2 - 1) * (1 / debugViewScale) * device.aspect + b2Preview.offset.x;
	const y = -((yPixel / device.height) * 2 - 1) * (1 / debugViewScale) + b2Preview.offset.y;
	result.Set(x, y);
	return result;
}

export function convertVec2Tob2Space(vector: Vec2, b2Preview: Box2DPreviewMesh) {
	const result: Vec2 = new Vec2();
	const x = ((vector.x / device.width) * 2 - 1) * (1 / debugViewScale) * device.aspect + b2Preview.offset.x;
	const y = -((vector.y / device.height) * 2 - 1) * (1 / debugViewScale) + b2Preview.offset.y;
	result.Set(x, y);
	return result;
}

export type PBits =
	| "environment"
	| "architecture"
	| "penalty"
	| "goal"
	| "enemyWeapon"
	| "sound"
	| "noiseMaker"
	| "item"
	| "stink";

export const pBitsArr: PBits[] = [
	"environment",
	"architecture",
	"penalty",
	"goal",
	"enemyWeapon",
	"sound",
	"noiseMaker",
	"item",
	"stink"
];

export function makeBitMask(pbits: PBits[]) {
	let bitMask = 0;
	for (const pbit of pbits) {
		bitMask |= Math.pow(2, pBitsArr.indexOf(pbit) + 1);
	}
	return bitMask;
}

export function translateCategoryBitsToString(categoryBits: number) {
	const binaryString = categoryBits.toString(2);

	if (binaryString.indexOf("1") !== binaryString.lastIndexOf("1")) {
		throw new Error("Category Bits not a power of 2");
	}

	const index = Math.log2(categoryBits) - 1;

	return pBitsArr[index];
}

export function createPhysicsCircle(b2World: World, x: number, y: number, radius: number, ballsSelfCollide = true) {
	const circle = new CircleShape(radius);
	const fixtureDef = new FixtureDef();
	fixtureDef.shape = circle;
	fixtureDef.density = 1; // <-- controls mass/weightiness
	fixtureDef.friction = 0.2; // <-- controls the friction the shape experiences in contact with others bodies/shapes
	fixtureDef.restitution = 0.7; // <-- controls elasticity/bounciness

	const bodyDef = new BodyDef();
	bodyDef.type = BodyType.b2_dynamicBody;

	// fixtureDef.filter.categoryBits = makeBitMask(["enemy"]); // <-- categoryBits: "I am a..."
	// const maskArr: PBits[] = ["environment", "hero", "heroWeapon"];
	// if (ballsSelfCollide) {
	// 	maskArr.push("enemy");
	// }
	// fixtureDef.filter.maskBits = makeBitMask(maskArr); // <-- maskBits: "I collide with..."

	// const userData = {
	// 	health: 3,
	// 	isEnemy: true,
	// 	isDead: false
	// };

	const circleBody = getBodyEventManager().createBody(bodyDef);
	circleBody.SetPositionXY(x, y);
	circleBody.CreateFixture(fixtureDef);
	// circleBody.SetUserData(userData);
	return circleBody;
}

export function createImprovedPhysicsCircle(
	b2World: World,
	x: number,
	y: number,
	radius: number,
	categoryArray?: PBits[],
	maskArray?: PBits[],
	entityData?: any,
	isSensor?: boolean,
	isBullet?: boolean,
	density?: number,
	bodyDefType?: BodyType | number
) {
	const circle = new CircleShape(radius);
	const fixtureDef = new FixtureDef();
	fixtureDef.shape = circle;
	fixtureDef.density = 1; // <-- controls mass/weightiness
	if (density) {
		fixtureDef.density = density;
	}
	fixtureDef.friction = 0.2; // <-- controls the friction the shape experiences in contact with others bodies/shapes
	fixtureDef.restitution = 0.7; // <-- controls elasticity/bounciness

	const bodyDef = new BodyDef();
	bodyDef.userData = entityData;

	bodyDef.type = bodyDefType ? bodyDefType : BodyType.b2_dynamicBody;

	// if (bodyDefType) {
	// 	bodyDef.type = bodyDefType;
	// } else {
	// 	bodyDef.type = BodyType.b2_dynamicBody;
	// }

	if (categoryArray && maskArray) {
		fixtureDef.filter.categoryBits = makeBitMask(categoryArray); // <-- categoryBits: "I am a..."
		fixtureDef.filter.maskBits = makeBitMask(maskArray); // <-- maskBits: "I collide with..."
	}

	if (isSensor) {
		fixtureDef.isSensor = true;
	}

	if (isBullet) {
		bodyDef.bullet = true;
	}

	const circleBody = getBodyEventManager().createBody(bodyDef);
	circleBody.SetPositionXY(x, y);
	circleBody.CreateFixture(fixtureDef);

	// if (entityData) {
	// 	circleBody.SetUserData(entityData);
	// }

	return circleBody;
}

export function createImprovedCircularSensor(
	body: b2Body,
	sensorRadius: number,
	categoryArray: PBits[],
	maskArray: PBits[]
) {
	const sensorRange = new CircleShape();
	sensorRange.Set(new Vec2(0.0, 0.0), sensorRadius);

	const sensorFixtureDef = new FixtureDef();
	sensorFixtureDef.shape = sensorRange;
	sensorFixtureDef.isSensor = true;
	sensorFixtureDef.filter.categoryBits = makeBitMask(categoryArray);
	sensorFixtureDef.filter.maskBits = makeBitMask(maskArray);

	const resultingFixture = body.CreateFixture(sensorFixtureDef);
	return resultingFixture;
}

export class WallData {
	serializable: true;
}

const __queryCallback = new SingleEnvironmentBlockQueryCallBack(undefined);
export function queryForSingleEnvironmentBlock(world: World, clickedb2Space: Vec2, halfAABBsize?: number) {
	if (!halfAABBsize) {
		halfAABBsize = 0.001;
	}

	const testAABB: AABB = new AABB();
	testAABB.lowerBound.Set(clickedb2Space.x - halfAABBsize, clickedb2Space.y - halfAABBsize);
	testAABB.upperBound.Set(clickedb2Space.x + halfAABBsize, clickedb2Space.y + halfAABBsize);

	__queryCallback.reset();
	__queryCallback.clickedGameSpace = clickedb2Space;
	world.QueryAABB(__queryCallback, testAABB);

	if (__queryCallback.environmentBlockBody) {
		const position = __queryCallback.environmentBlockBody.GetPosition();
		console.log(`environmentBlockBody already exists at position: ${position.x}x  ${position.y}y`);
		return __queryCallback.environmentBlockBody;
	} else {
		return undefined;
	}
}

const __architectureQueryCallback = new SingleArchitectureBodyQueryCallBack(undefined);
export function queryForSingleArchitectureBody(world: World, clickedb2Space: Vec2, halfAABBsize?: number) {
	if (!halfAABBsize) {
		halfAABBsize = 0.001;
	}

	const testAABB: AABB = new AABB();
	testAABB.lowerBound.Set(clickedb2Space.x - halfAABBsize, clickedb2Space.y - halfAABBsize);
	testAABB.upperBound.Set(clickedb2Space.x + halfAABBsize, clickedb2Space.y + halfAABBsize);

	__architectureQueryCallback.reset();
	__architectureQueryCallback.clickedGameSpace = clickedb2Space;
	world.QueryAABB(__architectureQueryCallback, testAABB);

	if (__architectureQueryCallback.architectureBody) {
		// const position = __architectureQueryCallback.architectureBody.GetPosition();
		// console.log(`architectureBody exists at position: ${position.x}x  ${position.y}y`);
		return __architectureQueryCallback.architectureBody;
	} else {
		return undefined;
	}
}

export function gridifyVectorToZeroPoint2(placementLocation: Vec2) {
	placementLocation.x = placementLocation.x / __tileSize;
	placementLocation.x = Math.round(placementLocation.x);
	placementLocation.x = placementLocation.x * __tileSize;
	placementLocation.x = parseFloat(placementLocation.x.toFixed(1));

	placementLocation.y = placementLocation.y / __tileSize;
	placementLocation.y = Math.round(placementLocation.y);
	placementLocation.y = placementLocation.y * __tileSize;
	placementLocation.y = parseFloat(placementLocation.y.toFixed(1));

	return placementLocation;
}
