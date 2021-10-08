import { __INITIAL_LEVEL_DURATION } from "~/settings/constants";

export default class Player {
	currentHealth: number = 5;
	maxHealth: number = 5;

	currentLevel = 0;

	currentTimer: number = __INITIAL_LEVEL_DURATION;
	maxTimer: number = __INITIAL_LEVEL_DURATION;
}
