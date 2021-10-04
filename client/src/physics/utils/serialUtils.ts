import { World } from "box2d";
// import { Player } from "~/helpers/scenes/Testb2World";

import { ArchitectParams, createArchitectMeshAndFixtures, isArchitectParams } from "./physicsUtils";

export type WorldData = ArchitectParams[];

export async function loadLevelData(b2World: World, data: WorldData): Promise<void> {
	const bodies = [];
	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			bodies.push(body);
		}
	}
	bodies.forEach(body => b2World.DestroyBody(body));

	await Promise.all(data.map(createArchitectMeshAndFixtures));
}

export function serializeWorld(b2World: World): WorldData {
	const data: WorldData = [];

	// const playerHealth: Player = new Player()

	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			const { x, y } = body.GetPosition();
			data.push({ ...body.m_userData, x, y, angle: body.GetAngle() });
		}
	}
	return data;
}

export function saveLevelBeforeUnload(b2World: World) {
	window.onbeforeunload = () => {
		localStorage.setItem("level", JSON.stringify(serializeWorld(b2World)));
	};
}

export function saveLevelData(b2World: World) {
	localStorage.setItem("level", JSON.stringify(serializeWorld(b2World)));
}
