import { GamePadAPI } from "~/helpers/utils/gamePad";

import { Controller } from "./Controller";

export default class GamePadController extends Controller {
	constructor(gamePadAPI: GamePadAPI) {
		super();
		// const aim = this.aim;
		// const intent = this.desiredMovementVector;

		gamePadAPI.listenToAxis(0, (val, timestamp) => {
			// intent.x = cleanAnalogValue(val);
			//console.log(`intent: ${intent.x}x, ${intent.y}y`);
		});
		gamePadAPI.listenToAxis(1, (val, timestamp) => {
			// intent.y = cleanAnalogValue(-val);
			//console.log(`intent: ${intent.x}x, ${intent.y}y`);
		});
		gamePadAPI.listenToAxis(2, (val, timestamp) => {
			// aim.x = cleanAnalogValue(val);
		});
		gamePadAPI.listenToAxis(3, (val, timestamp) => {
			// aim.y = cleanAnalogValue(-val);
		});
		gamePadAPI.listenToButton(7, val => {
			// this.requestRangedAttack = val > 0;
		});

		gamePadAPI.listenToButton(5, val => {
			// this.requestMeleeAttack = val > 0;
		});

		gamePadAPI.listenToButton(6, val => {
			// this.isRunning = val !== 0;
		});

		// quick way to check which button you pressed
		// for (let i = 0; i < gamePadAPI.buttonsCount; i++) {
		// 	function p(j: number) {
		// 		gamePadAPI.listenToButton(j, val => {
		// 			console.log(j, val);
		// 		});
		// 	}
		// 	p(i);
		// }
	}
}
