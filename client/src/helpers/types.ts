import { Body } from "box2d";
import { Object3D } from "three";
import { ArchitectParams } from "~/physics/utils/physicsUtils";

import Player from "./Player";

export type GameState =
	| "uninitialized"
	| "waitingForInput"
	| "playing"
	| "settling"
	| "checking"
	| "transitioning"
	| "gameOver";

export interface WorldData {
	gameState: GameState;
	player: Player;
	bodies: ArchitectParams[];
}

export interface Piece {
	body: Body;
	mesh: Object3D;
}
export type OnNewPieceCallback = (piece: Piece) => void;
