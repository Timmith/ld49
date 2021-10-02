import { BodyDef, Filter, FixtureDef, PolygonShape, Rot, ShapeType, Transform, Vec2, World } from "box2d";

import { getBodyEventManager } from "../managers/bodyEventManager";

import { WallData } from "./physicsUtils";
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

export function loadLevelData(levelDataString: string) {
	const levelData = JSON.parse(levelDataString) as WorldData;
	// debugger;
	for (const bodyData of levelData.bodies) {
		const bodyDef = new BodyDef();
		bodyDef.userData = new WallData();
		bodyDef.angularDamping = bodyData.angularDamping;
		bodyDef.angularVelocity = bodyData.angularVelocity;
		bodyDef.type = bodyData.bodyType;
		bodyDef.fixedRotation = bodyData.fixedRotationFlag;
		bodyDef.linearDamping = bodyData.linearDamping;

		const body = getBodyEventManager().createBody(bodyDef);

		body.SetLinearVelocity(unpackVec2(bodyData.linearVelocity));
		body.SetAngularVelocity(bodyData.angularVelocity);

		body.SetTransform(unpackTransform(bodyData.xf));
		// body.SetTransform(unpackTransform(bodyData.xf0));
		for (const fixtureData of bodyData.fixtures) {
			const fixtureDef = new FixtureDef();
			fixtureDef.density = fixtureData.density;

			fixtureDef.friction = fixtureData.friction;
			fixtureDef.isSensor = fixtureData.isSensor;
			fixtureDef.restitution = fixtureData.restitution;
			fixtureDef.restitutionThreshold = fixtureData.restitutionThreshold;

			switch (fixtureData.shape.type) {
				case ShapeType.e_chainShape:
					// debugger;
					break;
				case ShapeType.e_circleShape:
					// debugger;
					break;
				case ShapeType.e_edgeShape:
					// debugger;
					break;
				case ShapeType.e_polygonShape:
					const polyShapeData = fixtureData.shape as PolygonShapeData;
					const polyShape = new PolygonShape();

					polyShape.m_count = polyShapeData.count;
					polyShape.m_radius = polyShapeData.radius;
					polyShape.m_normals = polyShapeData.normals.map(unpackVec2);
					// const unpackedVertices: Vec2[] = [];
					// for (const vertice of polyShapeData.vertices) {
					// 	unpackedVertices.push(unpackVec2(vertice));
					// } USE MAP TO ITERATE THROUGH ELEMENTS WITH FUNCTION INTO NEW ARRAY WHICH IS THEN ASSIGNED
					polyShape.m_vertices = polyShapeData.vertices.map(unpackVec2);

					fixtureDef.shape = polyShape;

					// debugger;
					break;
				case ShapeType.e_shapeTypeCount:
					// debugger;
					break;
				case ShapeType.e_unknown:
					// debugger;
					break;
			}
			// debugger;
			const fixture = body.CreateFixture(fixtureDef);
			fixture.SetFilterData(unpackFilter(fixtureData.filter));
			// body.SetUserData({ serializable: true });
		}
	}
}

export function saveLevelBeforeUnload(b2World: World) {
	window.onbeforeunload = () => {
		const bodies: BodyData[] = [];
		const data: WorldData = {
			bodies
		};

		let body = b2World.GetBodyList();
		// debugger;
		while (body) {
			if (!(body.m_userData instanceof WallData) || !body.GetFixtureList()) {
				// if body is not of WallData OR !!!there is no FixtureList!!!
				// found a bug where Wall bodies existed without their fixtures
				// (meaning no physics but leaves behind visual artifact in graphics3D test)
				body = body.m_next;
				continue;
			}

			//const pos = packVec2(body.GetPosition());
			const bodyType = body.m_type;
			let fixture = body.GetFixtureList();
			const fixtures: FixtureData[] = [];

			while (fixture) {
				const shapeSRC = fixture.m_shape;
				let shape: ShapeData | undefined;

				if (shapeSRC instanceof PolygonShape) {
					const poly: PolygonShapeData = {
						type: shapeSRC.m_type,
						vertices: shapeSRC.m_vertices.map(packVec2),
						normals: shapeSRC.m_normals.map(packVec2),
						radius: shapeSRC.m_radius,
						count: shapeSRC.m_count
					};

					shape = poly;
				}

				if (shape) {
					const fixtureData: FixtureData = {
						shape,
						density: fixture.m_density,
						filter: packFilter(fixture.m_filter),
						friction: fixture.m_friction,
						isSensor: fixture.m_isSensor,
						restitution: fixture.m_restitution,
						restitutionThreshold: fixture.m_restitutionThreshold
					};
					fixtures.push(fixtureData);
				}

				fixture = fixture.m_next;
			}

			const bodyData: BodyData = {
				bodyType,
				fixtures,
				angularDamping: body.m_angularDamping,
				angularVelocity: body.m_angularVelocity,
				fixedRotationFlag: body.m_fixedRotationFlag,
				linearDamping: body.m_linearDamping,
				linearVelocity: packVec2(body.m_linearVelocity),
				torque: body.m_torque,
				xf: packTransform(body.m_xf),
				xf0: packTransform(body.m_xf0)
			};
			bodies.push(bodyData);
			body = body.m_next;
		}

		localStorage.setItem("level", JSON.stringify(data));
	};
}
