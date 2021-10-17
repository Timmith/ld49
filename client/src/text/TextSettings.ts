import { Color, Vector2 } from "three";
import { COLOR_BLACK, COLOR_WHITE } from "~/utils/colorLibrary";

import FontFace, { fontFaces } from "./FontFace";
import { textLayouts } from "./TextLayout";
import { Gradient } from "./TextMesh";

export interface TextSettings {
	fontFace: FontFace;
	size: number;
	align: "left" | "center" | "right";
	vAlign: "top" | "center" | "bottom";
	width?: number;
	lineHeight?: number;
	letterSpacing: number;
	color: Color | Gradient | string | number;
	strokeWidth: number;
	strokeBias: number;
	strokeColor: Color | string | number;
	alphaTest: number;
	scaleDownToPhysicalSize: boolean;
	shadow: boolean;
	screenSpace: boolean;
	constantSizeOnScreen?: boolean;
	offset?: Vector2;
	bakedOffset?: Vector2;
	prescale?: number;
}

const generic: TextSettings = {
	fontFace: fontFaces.GothicA1Regular,
	size: 24,
	align: "center",
	vAlign: "center",
	letterSpacing: 0,
	color: COLOR_WHITE,
	strokeWidth: 0,
	strokeBias: 1.0,
	alphaTest: 0,
	strokeColor: COLOR_BLACK,
	scaleDownToPhysicalSize: true,
	shadow: false,
	screenSpace: false,
	constantSizeOnScreen: false,
	prescale: 1
};
const ui: TextSettings = {
	...generic,
	fontFace: fontFaces.GothicA1Bold,
	scaleDownToPhysicalSize: false
};
const bold: TextSettings = {
	...ui,
	fontFace: fontFaces.GothicA1ExtraBold
};
const height: TextSettings = {
	...bold,
	strokeColor: COLOR_BLACK,
	strokeBias: 1,
	strokeWidth: 0.45
};
const title: TextSettings = {
	...ui,
	...textLayouts.title,
	lineHeight: 1.175,
	size: 72,
	color: COLOR_BLACK,
	strokeWidth: 0.5,
	strokeBias: 0.5,
	strokeColor: COLOR_WHITE,
	fontFace: fontFaces.GothicA1ExtraBold
};
const keyLabel: TextSettings = {
	...generic,
	lineHeight: 1.175,
	size: 24,
	color: COLOR_WHITE,
	fontFace: fontFaces.GothicA1Regular
};
const keyLabelDouble: TextSettings = {
	...keyLabel,
	lineHeight: 1.2,
	fontFace: fontFaces.GothicA1Bold,
	size: 14
};
const keyLabelSmall: TextSettings = {
	...keyLabel,
	fontFace: fontFaces.GothicA1Bold,
	size: 10
};
const code: TextSettings = {
	...generic,
	align: "left",
	fontFace: fontFaces.CourierPrimeRegular,
	size: 32,
	lineHeight: 3,
	color: 0x009900
};
const leaderBoardTitle: TextSettings = {
	...ui,
	fontFace: fontFaces.CourierPrimeRegular,
	size: 72
};
const leaderBoardEntry: TextSettings = {
	...leaderBoardTitle,
	size: 32
};
const leaderBoardEntryLeft: TextSettings = {
	...leaderBoardEntry,
	align: "left"
};
const leaderBoardEntryRight: TextSettings = {
	...leaderBoardEntry,
	align: "right"
};

export const textSettings = {
	generic,
	leaderBoardTitle,
	leaderBoardEntry,
	leaderBoardEntryLeft,
	leaderBoardEntryRight,
	ui,
	bold,
	height,
	title,
	keyLabel,
	keyLabelDouble,
	keyLabelSmall,
	code
};
