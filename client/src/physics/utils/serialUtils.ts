import { World } from "box2d";

import { onDestructionQueueCleared, queueDestruction } from "../managers/destructionManager";

import { ArchitectParams, createArchitectMeshAndFixtures, isArchitectParams } from "./physicsUtils";
// import { Player } from "~/helpers/scenes/Testb2World";

export type WorldData = ArchitectParams[];

export async function loadLevelData(b2World: World, data: WorldData): Promise<void> {
	const oldBodies = [];
	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			oldBodies.push(body);
		}
	}
	oldBodies.forEach(queueDestruction);
	await new Promise<void>(resolve => onDestructionQueueCleared(resolve));

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
		saveLevelDataToLocalStorage(b2World);
	};
}

export function saveLevelDataToLocalStorage(b2World: World) {
	const dataString = JSON.stringify(serializeWorld(b2World));
	console.log(`saved ${dataString.length * 2} bytes of data`);
	localStorage.setItem("level", dataString);
}

export function loadLevelDataFromLocalStorage(b2World: World) {
	const dataString = localStorage.getItem("level");
	if (dataString) {
		loadLevelData(b2World, JSON.parse(dataString));
	} else {
		console.warn("no level data in localStorage");
	}
}
