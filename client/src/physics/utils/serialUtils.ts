import { World } from "box2d";

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
	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			data.push(body.m_userData);
		}
	}
	return data;
}

export function saveLevelBeforeUnload(b2World: World) {
	window.onbeforeunload = () => {
		localStorage.setItem("level", JSON.stringify(serializeWorld(b2World)));
	};
}
