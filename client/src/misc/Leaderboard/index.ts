import {
	AdditiveBlending,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	OrthographicCamera,
	PlaneBufferGeometry,
	Scene,
	WebGLRenderer,
	WebGLRenderTarget
} from "three";
import { getLeaders, listenForLeadersRefresh } from "~/leaderboard";
import TextMesh from "~/text/TextMesh";
import { textSettings } from "~/text/TextSettings";
import { COLOR_BLACK } from "~/utils/colorLibrary";

export default class LeaderBoard {
	mesh: Mesh;
	private _scene: Scene;
	private _camera: OrthographicCamera;
	private _renderTarget: WebGLRenderTarget;
	private _leaderboardEntries: Object3D[] = [];
	private _dirty = true;
	constructor(mesh?: Mesh) {
		this._scene = new Scene();
		this._camera = new OrthographicCamera(0, 640, 480, 0, -100, 100);
		this._renderTarget = new WebGLRenderTarget(640, 480);
		const mat = new MeshBasicMaterial({
			map: this._renderTarget.texture
		});
		if (mesh) {
			mat.blending = AdditiveBlending;
			mat.depthTest = false;
			mat.transparent = true;
			mesh.material = mat;
			this.mesh = mesh;
		} else {
			this.mesh = new Mesh(new PlaneBufferGeometry(1, 1), mat);
		}
		const label = new TextMesh("LEADERBOARD", textSettings.leaderBoardTitle);
		label.onMeasurementsUpdated = () => {
			this._dirty = true;
		};
		label.position.set(320, 480 - 40, 0);

		listenForLeadersRefresh(data => {
			this._dirty = true;
			for (const entry of this._leaderboardEntries) {
				this._scene.remove(entry);
			}
			this._leaderboardEntries.length = 0;
			for (let i = 0; i < data.length; i++) {
				const leader = data[i];
				const entry = new Object3D();
				const mesh1 = new TextMesh((leader.place + 1).toString(), textSettings.leaderBoardEntryLeft);
				mesh1.onMeasurementsUpdated = () => {
					this._dirty = true;
				};
				const mesh2 = new TextMesh(leader.summary, textSettings.leaderBoardEntry);
				const mesh3 = new TextMesh(`${(leader.score * 0.01).toFixed(2)}m`, textSettings.leaderBoardEntryRight);
				mesh1.position.x = -200;
				mesh2.position.x = -60;
				mesh3.position.x = 200;
				entry.add(mesh1);
				entry.add(mesh2);
				entry.add(mesh3);
				entry.position.set(320, 480 - 110 - i * 36, 0);
				this._leaderboardEntries.push(entry);
				this._scene.add(entry);
			}
		});
		try {
			getLeaders(10);
		} catch (e) {
			console.warn("leaderboard not available, hiding mesh");
			this.mesh.visible = false;
		}

		this._scene.add(label);
	}
	update(dt: number) {}
	render(renderer: WebGLRenderer) {
		if (this._dirty) {
			this._dirty = false;
			renderer.setRenderTarget(this._renderTarget);
			renderer.setClearColor(COLOR_BLACK);
			renderer.clear(true, true, true);
			renderer.render(this._scene, this._camera);
			renderer.setRenderTarget(null);
		}
	}
}
