import { AdditiveBlending, ShaderMaterial, Texture, Uniform } from "three";
import { timeUniform } from "~/uniforms";

import fragmentShader from "./frag.glsl";
import vertexShader from "./vert.glsl";

export class VhsMaterial extends ShaderMaterial {
	constructor(texture: Texture) {
		super({
			uniforms: {
				uTexture: new Uniform(texture),
				uTime: timeUniform
			},
			vertexShader,
			fragmentShader,
			transparent: true,
			depthWrite: false,
			depthTest: false,
			blending: AdditiveBlending
		});
	}
}
