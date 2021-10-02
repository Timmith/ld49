import KeyboardInput from "./KeyboardInput";

let _ki: KeyboardInput | undefined;
export default function getKeyboardInput(preventDefault = true) {
	if (!_ki) {
		_ki = new KeyboardInput(preventDefault);
	}
	return _ki;
}

export function rigToKeyboard(callback: (controller: KeyboardInput) => void) {
	let initd = false;
	window.addEventListener("keydown", (e: GamepadEvent) => {
		if (initd) {
			return;
		}
		initd = true;
		console.log("Keyboard connected.");
		callback(getKeyboardInput());
	});
}
