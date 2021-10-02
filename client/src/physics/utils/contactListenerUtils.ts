import MetaContactListener from "~/physics/contact listeners/MetaContactListener";

let mcl: MetaContactListener;

export function getMetaContactListener() {
	if (!mcl) {
		mcl = new MetaContactListener();
	}
	return mcl;
}
