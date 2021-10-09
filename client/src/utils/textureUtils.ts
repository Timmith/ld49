import { NearestFilter, Texture, TextureLoader } from "three";

const textures = new Map<string, Promise<Texture>>();
const imageLoader: TextureLoader = new TextureLoader();

export function getTexture(url: string) {
	if (textures.has(url)) {
		return textures.get(url)!;
	} else {
		const promise = imageLoader.loadAsync(url);
		promise.then(tex => {
			tex.minFilter = NearestFilter;
			tex.magFilter = NearestFilter;
		});
		textures.set(url, promise);
		return promise;
	}
}
