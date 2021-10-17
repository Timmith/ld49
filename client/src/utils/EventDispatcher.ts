export default class EventDispatcher<T> {
	private _listeners: Array<(val: T) => void> = [];
	private _lastKnownValue: T;
	dispatch(val: T) {
		this._lastKnownValue = val;
		for (const cb of this._listeners) {
			cb(val);
		}
	}
	addListener(cb: (val: T) => void, firstOneFree = true) {
		this._listeners.push(cb);
		if (this._lastKnownValue) {
			cb(this._lastKnownValue);
		}
	}
}
