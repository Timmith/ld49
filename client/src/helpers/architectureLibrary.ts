import { randInt } from "~/utils/math";

const architectureLibrary = {
	column1: 2,
	column2: 2,
	column3: 2,
	column4: 2,
	column5: 1,
	vase: 2
};
const baseModels = Object.keys(architectureLibrary);

export function getArchitecturePiece(
	meshName = baseModels[randInt(baseModels.length)] as keyof typeof architectureLibrary,
	colliderName = "collider" + randInt(architectureLibrary[meshName], 1)
) {
	return { meshName, colliderName };
}
