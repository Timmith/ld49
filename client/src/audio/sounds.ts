import { Body, Vec2 } from "box2d";
import { zzfx } from "zzfx";
import { getUrlFloat } from "~/utils/location";
import { distanceTo } from "~/utils/math";

const soundLib = {
	gameOver: [, , 925, 0.04, 0.3, 0.6, 1, 0.3, , 6.27, -184, 0.09, 0.17],
	itemPickup: [2.03, , 438, , 0.03, 0.12, , 1.5, , , -753, 0.05, , , , , 0.02, 0.53, 0.01],
	soundMaker: [1.76, , 1035, , 0.03, 0.2, 4, 0, 50, , , , 0.04, , , 0.1, 0.08, 0.63, 0.05],
	build: [2.07, , 1037, 0.01, 0.01, 0.13, 2, 0.1, 33, , , , , , -149, 0.5, 0.03, 0.49, 0.02, 0.53],
};

let __ears: Body | undefined;
export function registerEars(body: Body) {
	__ears = body;
}

const __maxDist = 4;
const __masterVolume = getUrlFloat("volume", 1, 0, 1);
export function playWorldSound(key: keyof typeof soundLib, from: Vec2, volume = 1) {
	if (__ears) {
		return playSound(
			key,
			volume * Math.pow(Math.max(0, 1 - distanceTo(__ears.GetPosition(), from) / __maxDist), 2)
		);
	} else {
		return playSound(key, volume * 0.1);
	}
}

export function playSound(key: keyof typeof soundLib, volume = 1) {
	const v = __masterVolume * volume;
	const params = soundLib[key].slice(0);
	params[0] = params[0] === undefined ? v : params[0] * v;
	const s = zzfx(...params);
	return s;
}
