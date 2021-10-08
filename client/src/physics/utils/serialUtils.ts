import { World } from "box2d";
import Player from "~/helpers/Player";

import { onDestructionQueueCleared, queueDestruction } from "../managers/destructionManager";

import { ArchitectParams, createArchitectMeshAndFixtures, isArchitectParams } from "./physicsUtils";
// import { Player } from "~/helpers/scenes/Testb2World";

export interface WorldData {
	player: Player;
	bodies: ArchitectParams[];
}

export async function loadLevelData(player: Player, b2World: World, data: WorldData): Promise<void> {
	const oldBodies = [];
	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			oldBodies.push(body);
		}
	}
	oldBodies.forEach(queueDestruction);
	await new Promise<void>(resolve => onDestructionQueueCleared(resolve));

	await Promise.all(data.bodies.map(createArchitectMeshAndFixtures));
}

export function serializeWorld(player: Player, b2World: World): WorldData {
	const bodies: ArchitectParams[] = [];
	const data: WorldData = { player, bodies };

	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			const { x, y } = body.GetPosition();
			bodies.push({ ...body.m_userData, x, y, angle: body.GetAngle() });
		}
	}
	return data;
}

export function saveLevelBeforeUnload(player: Player, b2World: World) {
	window.onbeforeunload = () => {
		saveLevelDataToLocalStorage(player, b2World);
	};
}

export function saveLevelDataToLocalStorage(player: Player, b2World: World) {
	const dataString = JSON.stringify(serializeWorld(player, b2World));
	console.log(`saved ${dataString.length * 2} bytes of data`);
	localStorage.setItem("level", dataString);
}

export function loadLevelDataFromLocalStorage(player: Player, b2World: World) {
	const dataString = localStorage.getItem("level");
	if (dataString) {
		loadLevelData(player, b2World, JSON.parse(dataString));
	} else {
		console.warn("no level data in localStorage");
	}
}
