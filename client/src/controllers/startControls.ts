import { World } from "box2d";
import { Box2DPreviewMesh } from "~/meshes/Box2DPreviewMesh";
import SimpleGUIOverlay from "~/ui/SimpleGUIOverlay";
import { RayCastConverter } from "~/utils/RayCastConverter";

export function startControls(
	b2World: World,
	rayCastConverter: RayCastConverter,
	gui: SimpleGUIOverlay,
	b2Preview?: Box2DPreviewMesh
) {
	const postUpdates: Array<(dt: number) => void> = [];

	//const avatarContactListener = new AvatarContactListener();
	// const mcl = getMetaContactListener();
	// mcl.register(avatarContactListener);
	// b2World.SetContactListener(mcl);

	// const initiateControls = (controller: Controller) => {
	// 	registerHUD(gui);
	// };

	// rigToGamePad(gamePadAPI => initiateControls(new GamePadControls(gamePadAPI)));

	// rigToKeyboard(keyboardAPI =>
	// 	initiateControls(new MouseKeyboardController(keyboardAPI, rayCastConverter, gui, b2Preview!))
	// );

	// rigToTouchScreen(touchScreenAPI => initiateControls(new TouchScreenController(gui)));

	// hacky way of testing two characters on a keyboard
	// rigToKeyboard(keyboardAPI => {
	//   makeCharacter(new CharacterKeyboardController(keyboardAPI))
	//   makeCharacter(new CharacterKeyboardController(keyboardAPI, true))
	// })

	const postUpdate = (dt: number) => {
		/* Responsible for the "camera tracking" of the first character */
		// if (firstCharacter && b2Preview) {
		// 	b2Preview.offset.Copy(firstCharacter.avatarBody.GetPosition());
		// }
		for (const pu of postUpdates) {
			pu(dt);
		}
	};
	return postUpdate;
}
