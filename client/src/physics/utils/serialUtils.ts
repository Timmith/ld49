import { World } from "box2d";
import Player from "~/helpers/Player";
import { GameState, OnNewPieceCallback, WorldData } from "~/helpers/types";

import { onDestructionQueueCleared } from "../managers/destructionManager";

import { ArchitectParams, createArchitectMeshAndFixtures, isArchitectParams } from "./physicsUtils";
// import { Player } from "~/helpers/scenes/Testb2World";

export async function loadLevelData(player: Player, data: WorldData, onNewPiece: OnNewPieceCallback): Promise<void> {
	await new Promise<void>(resolve => onDestructionQueueCleared(resolve));

	await Promise.all(
		data.bodies.map(b => {
			const p = createArchitectMeshAndFixtures(b);
			p.then(v => onNewPiece(v));
			return p;
		})
	);

	player.currentHealth = data.player.currentHealth;
	player.currentLevel = data.player.currentLevel;
	player.currentTimer = data.player.currentTimer;
	player.maxHealth = data.player.maxHealth;
	player.maxTimer = data.player.maxTimer;
	player.physicsTime = data.player.physicsTime;
	player.currentHeight = data.player.currentHeight;
}

export function serializeWorld(gameState: GameState, player: Player, b2World: World): WorldData {
	const bodies: ArchitectParams[] = [];

	for (let body = b2World.GetBodyList(); body; body = body.m_next) {
		if (isArchitectParams(body.m_userData)) {
			const { x, y } = body.GetPosition();
			const { x: vx, y: vy } = body.GetLinearVelocity();
			bodies.push({
				...body.m_userData,
				x,
				y,
				vx,
				vy,
				angle: body.GetAngle(),
				vAngle: body.GetAngularVelocity()
			});
		}
	}
	return { gameState, player, bodies };
}

export function saveLevelBeforeUnload(gameState: GameState, player: Player, b2World: World) {
	window.onbeforeunload = () => {
		saveLevelDataToLocalStorage(gameState, player, b2World);
	};
}

export function saveLevelDataToLocalStorage(gameState: GameState, player: Player, b2World: World) {
	const dataString = JSON.stringify(serializeWorld(gameState, player, b2World));
	console.log(`saved ${dataString.length * 2} bytes of data`);
	localStorage.setItem("level", dataString);
}

export async function loadLevelDataFromLocalStorage(player: Player, onNewPiece: OnNewPieceCallback) {
	const dataString = localStorage.getItem("level");
	if (dataString) {
		const data = JSON.parse(dataString) as WorldData;
		await loadLevelData(player, data, onNewPiece);
		return data;
	} else {
		console.warn("no level data in localStorage");
		return undefined;
	}
}
