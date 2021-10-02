import { Filter, Rot, Transform, Vec2 } from "box2d";
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////
export interface WorldData {
	bodies: BodyData[];
}
export interface BodyData {
	bodyType: number;
	fixtures: FixtureData[];
	angularDamping: number;
	angularVelocity: number;
	fixedRotationFlag: boolean;
	linearDamping: number;
	linearVelocity: Vec2Data;
	torque: number;

	xf: TransformData;
	xf0: TransformData;
}
export interface FixtureData {
	shape: ShapeData;
	density: number;
	filter: FilterData;
	friction: number;
	isSensor: boolean;
	restitution: number;
	restitutionThreshold: number;
}
export interface FilterData {
	categoryBits: number;
	maskBits: number;
	groupIndex: number;
}
export interface ShapeData {
	type: number;
	// points: PointData[]
}
export interface PolygonShapeData extends ShapeData {
	vertices: Vec2Data[];
	normals: Vec2Data[];
	radius: number;
	count: number;
}
export interface TransformData {
	p: Vec2Data;
	q: RotData;
}
export interface Vec2Data {
	x: number;
	y: number;
}
export interface RotData {
	s: number;
	c: number;
}
/////////////////////////////////////////////////////////////////////////////
////////////////////////////PACKERS AND UNPACKERS////////////////////////////
/////////////////////////////////////////////////////////////////////////////
export function packVec2(vec: Vec2) {
	return {
		x: vec.x,
		y: vec.y
	};
}

export function unpackVec2(vecData: Vec2Data) {
	return new Vec2(vecData.x, vecData.y);
}

export function packFilter(filter: Filter) {
	return {
		categoryBits: filter.categoryBits,
		groupIndex: filter.groupIndex,
		maskBits: filter.maskBits
	};
}

export function unpackFilter(filterData: FilterData) {
	const filter = new Filter();
	filter.categoryBits = filterData.categoryBits;
	filter.groupIndex = filterData.groupIndex;
	filter.maskBits = filterData.maskBits;
	return filter;
}

export function packRot(rot: Rot) {
	return {
		s: rot.s,
		c: rot.c
	};
}

export function unpackRot(rotData: RotData) {
	const rot = new Rot();
	rot.c = rotData.c;
	rot.s = rotData.s;
	return rot;
}

export function packTransform(transform: Transform) {
	return {
		p: packVec2(transform.p),
		q: packRot(transform.q)
	};
}

export function unpackTransform(transformData: TransformData) {
	const transform = new Transform();
	transform.SetPosition(unpackVec2(transformData.p));
	transform.SetRotation(unpackRot(transformData.q));
	return transform;
}
