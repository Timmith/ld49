import { CursorType } from "~/helpers/cursor/CursorType";

const __cursors: CursorType[] = [undefined, undefined, undefined, undefined];
export function changeCursor(cursor: CursorType, layer: 0 | 1 | 2 | 3) {
	if (cursor !== __cursors[layer]) {
		__cursors[layer] = cursor;
		for (let i = __cursors.length - 1; i >= 0; i--) {
			if (__cursors[i] !== undefined) {
				cursor = __cursors[i];
				break;
			}
		}
		document.body.style.cursor = cursor || "default";
	}
}

export function checkCursor(layer: 0 | 1 | 2 | 3) {
	return __cursors[layer];
}
