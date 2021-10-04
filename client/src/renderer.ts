import { PCFShadowMap, WebGLRenderer } from "three";
import { RESET_USER_SETTINGS_TO_DEFAULTS } from "~/settings/constants";

import device from "./device";
import { devicePixelRatioUniform, pixelSizeInClipSpaceUniform } from "./uniforms";
import { NiceParameter } from "./utils/NiceParameter";

export const canvas = document.createElement("canvas");

canvas.oncontextmenu = e => {
	e.preventDefault();
	e.stopPropagation();
};

// const context = canvas.getContext('webgl') as WebGLRenderingContext
const renderer = new WebGLRenderer({
	canvas,
	// context,
	antialias: true,
	premultipliedAlpha: false
	// powerPreference: "high-performance"
	// powerPreference: "low-power"
	// preserveDrawingBuffer: true
});
document.body.append(canvas);
const attributeValues: string[] = ["-moz-crisp-edges", "-webkit-crisp-edges", "pixelated", "crisp-edges"];

attributeValues.forEach(v => {
	//@ts-ignore
	renderer.getContext().canvas.style.setProperty("image-rendering", v);
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.autoClear = false;

const downsample = new NiceParameter(
	"pixel-down-sample-3",
	"Graphics Quality",
	0,
	0,
	10,
	v => v,
	v => v + "",
	true,
	RESET_USER_SETTINGS_TO_DEFAULTS,
	1
);

let __downsample = 1;
function updatePixelRatio() {
	const pixelRatio = device.pixelRatio / __downsample;
	devicePixelRatioUniform.value = pixelRatio;
	renderer.setPixelRatio(pixelRatio);
}

downsample.listen(downsample => {
	__downsample = Math.round(downsample + 1);
	updatePixelRatio();
});

device.onChange(() => {
	updatePixelRatio();
	const { width, height } = device;
	renderer.setSize(width, height);
	devicePixelRatioUniform.value = device.pixelRatio;
	pixelSizeInClipSpaceUniform.value.set(2 / width, 2 / height);
}, true);
export const maxTextureSize = Math.min(8192, renderer.capabilities.maxTextureSize);

export default renderer;
