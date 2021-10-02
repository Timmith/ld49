
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import TestLightingScene from "./TestLighting";

export default class TestLitModelsScene extends TestLightingScene {
	constructor() {
		super(false, false);
		const init = async () => {
            const loader = new GLTFLoader()
            const model = await loader.loadAsync('game/models/columns.glb')
            for (const obj of model.scene.children.slice()) {
                this.scene.add(obj)
                obj.position.z += 1
                obj.castShadow = true
                obj.receiveShadow = true
                const dist = Math.sqrt(Math.pow(obj.position.x, 2) + Math.pow(obj.position.z, 2))
                const angle = Math.atan2(obj.position.z, obj.position.x) + Math.PI * 0.5
                obj.position.set(Math.cos(angle) * dist,obj.position.y,Math.sin(angle) * dist)
            }
		};
		init();
	}
}
