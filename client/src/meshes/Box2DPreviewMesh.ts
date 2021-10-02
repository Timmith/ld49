import { Body, CircleShape, Fixture, PolygonShape, Shape, ShapeType, Vec2, World } from "box2d";
import { BufferGeometry, Float32BufferAttribute, Line, Matrix4, Quaternion, Sphere, Vector3 } from "three";
import device from "~/device";
import { Box2DPreviewMaterial } from "~/materials/Box2DPreviewMaterial";
import { getUrlFlag } from "~/utils/location";
import { rand2 } from "~/utils/math";

export let debugViewScale = 0.6;

const __circleSegs = 16;
const __contactMarkerSegs = 6; // Hexagonal
const __contactMarkerColor = new Vector3(1, 0, 0); // Red
const __colorMatrixVisible = new Matrix4().compose(
	new Vector3(0.5, 0.5, 0.5),
	new Quaternion(),
	new Vector3(0.5, 0.5, 0.5)
);
const __defaultQuaternion = new Quaternion();
const __defaultColorScale = new Vector3(0.5, 0.5, 0.5);

export const debugPolygonPhysics = {
	value: getUrlFlag("debugPhysicsPolygon")
};
class DebugColors {
	fixtureColors: Map<Fixture, Vector3>;
	bodyMatrices: Map<Body, Matrix4>;
	constructor() {
		this.fixtureColors = new Map<Fixture, Vector3>();
		this.bodyMatrices = new Map<Body, Matrix4>();
	}
	getFixtureColor(fixture: Fixture): Vector3 {
		if (!this.fixtureColors.has(fixture)) {
			const color = new Vector3(rand2(), rand2(), rand2())
				.applyMatrix4(this.getBodyMatrix(fixture.m_body))
				.applyMatrix4(__colorMatrixVisible);
			this.fixtureColors.set(fixture, color);
			return color;
		}
		return this.fixtureColors.get(fixture)!;
	}
	getBodyMatrix(body: Body): Matrix4 {
		if (!this.bodyMatrices.has(body)) {
			const matrix = new Matrix4().compose(
				//new Vector3(rand2(), rand2(), rand2()),
				new Vector3(rand2(0.5, 0.5), rand2(0.5, 0.5), rand2(0.5, 0.5)), //makes for brighter debug colours
				__defaultQuaternion,
				__defaultColorScale
			);
			this.bodyMatrices.set(body, matrix);
			return matrix;
		}
		return this.bodyMatrices.get(body)!;
	}
}

function getShapeWorldVerts(shape: Shape, body: Body) {
	switch (shape.m_type) {
		case ShapeType.e_polygonShape:
			if (debugPolygonPhysics.value) {
				return getPolygonShapeWorldVerts(shape as PolygonShape, body);
			} else {
				return undefined;
			}
		case ShapeType.e_circleShape:
			return getCircleShapeWorldVerts(shape as CircleShape, body);
		default:
			console.error("unsupported box2d shape type for debug view");
			return undefined;
	}
}

function getShapeWorldVertsCount(shape: Shape) {
	switch (shape.m_type) {
		case ShapeType.e_polygonShape:
			if (debugPolygonPhysics.value) {
				return (shape as PolygonShape).m_vertices.length;
			} else {
				return 0;
			}
		case ShapeType.e_circleShape:
			return __circleSegs;
		default:
			return 0;
	}
}

function getPolygonShapeWorldVerts(polygon: PolygonShape, body: Body) {
	return polygon.m_vertices.map(vert => {
		const worldVert = new Vec2();
		body.GetWorldPoint(vert, worldVert);
		worldVert.x /= device.aspect;
		return worldVert;
	});
}

function getCircleShapeWorldVerts(circle: CircleShape, body: Body) {
	const worldVerts: Vec2[] = [];
	const radius = circle.m_radius;
	const offset = circle.m_p;
	for (let i = 0; i < __circleSegs; i++) {
		const angle = (i / __circleSegs) * Math.PI * 2;
		const vert = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius).SelfAdd(offset);
		const worldVert = new Vec2();
		body.GetWorldPoint(vert, worldVert);
		worldVert.x /= device.aspect;
		worldVerts.push(worldVert);
	}
	return worldVerts;
}

function getContactWorldVerts(offset: Vec2) {
	const worldVerts: Vec2[] = [];
	const radius = 0.02;
	for (let i = 0; i < __contactMarkerSegs; i++) {
		const angle = (i / __contactMarkerSegs) * Math.PI * 2;
		const worldVert = new Vec2(Math.cos(angle) * radius, Math.sin(angle) * radius).SelfAdd(offset);
		worldVert.x /= device.aspect;
		worldVerts.push(worldVert);
	}
	return worldVerts;
}

function createGeometry(b2World: World, debugColors: DebugColors, offset: Vec2) {
	let fixtureVertsCount = 0;
	let body = b2World.m_bodyList;
	//measure first
	while (body) {
		let fixture = body.m_fixtureList;
		while (fixture) {
			fixtureVertsCount += getShapeWorldVertsCount(fixture.m_shape) + 3;
			//count + 3, to add extra vert to close shape and 2 extra verts to jump with transparency between shapes
			fixture = fixture.m_next;
		}
		body = body.m_next;
	}

	/* First section responsible for populating the fixtureVertsCount for active-contact markers */
	const cm = b2World.GetContactManager();
	let contacts = cm.m_contactList;
	while (contacts) {
		if (contacts.IsTouching()) {
			fixtureVertsCount += (__contactMarkerSegs + 3) * 2;
		}
		contacts = contacts.m_next;
	}

	const geometry = new BufferGeometry();
	geometry.boundingSphere = new Sphere(undefined, Infinity);

	const posArr = new Float32Array(fixtureVertsCount * 2);
	const colArr = new Float32Array(fixtureVertsCount * 4);

	let posArrIndex = 0;
	let colArrIndex = 0;

	function writeVert(vert: Vec2, color: Vector3, opacity: number = 1) {
		posArr[posArrIndex] = vert.x;
		posArr[posArrIndex + 1] = vert.y;
		posArrIndex += 2;
		color.toArray(colArr, colArrIndex);
		colArr[colArrIndex + 3] = opacity;
		colArrIndex += 4;
	}

	body = b2World.m_bodyList;
	const aspectCorrectOffset = new Vec2(offset.x / device.aspect, offset.y);
	while (body) {
		let fixture = body.m_fixtureList;
		while (fixture) {
			const shape = fixture.m_shape;
			const worldVerts = getShapeWorldVerts(shape, body);
			if (worldVerts) {
				const color = debugColors.getFixtureColor(fixture);
				addVertsToGeometry(worldVerts, color);
			}
			fixture = fixture.m_next;
		}
		body = body.m_next;
	}

	/* Second section responsible for red debug active-contact markers */
	contacts = cm.m_contactList;
	while (contacts) {
		if (contacts.IsTouching()) {
			for (const fixture of [contacts.GetFixtureA(), contacts.GetFixtureB()]) {
				const bodyPos = fixture.GetBody().GetPosition();
				const worldVerts = getContactWorldVerts(bodyPos);
				addVertsToGeometry(worldVerts, __contactMarkerColor);
			}
		}
		contacts = contacts.m_next;
	}

	geometry.setAttribute("position", new Float32BufferAttribute(posArr, 2));
	geometry.setAttribute("color", new Float32BufferAttribute(colArr, 4));
	return geometry;

	function addVertsToGeometry(worldVerts: Vec2[], color: Vector3) {
		if (offset.x !== 0 || offset.y !== 0) {
			for (const vert of worldVerts) {
				vert.SelfSub(aspectCorrectOffset);
			}
		}

		if (device.orientation === "landscape" && device.isMobile) {
			debugViewScale = 1.2;
		} else if (device.orientation === "portrait" && device.isMobile) {
			debugViewScale = 0.55;
		}

		if (debugViewScale !== 1) {
			for (const vert of worldVerts) {
				vert.SelfMul(debugViewScale);
			}
		}
		const vert0 = worldVerts[0];
		//first double transparent vert to jump from last shape
		writeVert(vert0, color, 0);
		//do all verts in shape
		for (const worldVert of worldVerts) {
			writeVert(worldVert, color, 1);
		}
		//extra vert to close shape
		writeVert(vert0, color, 1);
		//extra transparent vert to jump to next shape
		writeVert(vert0, color, 0);
	}
}

export class Box2DPreviewMesh extends Line {
	b2World: World;
	debugColors: DebugColors;
	offset: Vec2;
	constructor(b2World: World) {
		const debugColors = new DebugColors();
		const offset = new Vec2();
		super(createGeometry(b2World, debugColors, offset), new Box2DPreviewMaterial());
		this.debugColors = debugColors;
		this.b2World = b2World;
		this.offset = offset;
		this.renderOrder = 100000;
	}
	update(dt: number) {
		this.geometry.dispose();
		this.geometry = createGeometry(this.b2World, this.debugColors, this.offset);
	}
}
