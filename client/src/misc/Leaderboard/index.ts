import {
	AdditiveBlending,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	PlaneBufferGeometry,
	Raycaster,
	Scene,
	Vector2,
	WebGLRenderer,
	WebGLRenderTarget
} from "three";
import { getLeaders, listenForLeadersRefresh } from "~/leaderboard";
import { VhsMaterial } from "~/materials/VhsMaterial";
import { setRayCasterToCameraInUV } from "~/physics/utils/rayCastUtils";
import { __GIU_Z } from "~/settings/constants";
import TextMesh from "~/text/TextMesh";
import { textSettings } from "~/text/TextSettings";
import { COLOR_BLACK, COLOR_WHITE } from "~/utils/colorLibrary";

export default class LeaderBoard {
	mesh: Mesh;
	private _scene: Scene;
	private _camera: OrthographicCamera;
	private _renderTarget: WebGLRenderTarget;
	private _leaderboardEntries: Array<Mesh<PlaneBufferGeometry, MeshBasicMaterial>> = [];
	private _dirty = 3;

	private rayCaster: Raycaster;
	private _highlightedIndex: number = -1;
	get highlightedIndex(): number {
		return this._highlightedIndex;
	}
	set highlightedIndex(value: number) {
		if (this._highlightedIndex !== value) {
			if (this._highlightedIndex !== -1) {
				this._leaderboardEntries[this._highlightedIndex].material.visible = false;
			}
			this._highlightedIndex = value;
			if (this._highlightedIndex !== -1) {
				this._leaderboardEntries[this._highlightedIndex].material.visible = true;
			}
			this._dirty = 3;
		}
	}
	constructor(mesh?: Mesh) {
		this._scene = new Scene();
		this._camera = new OrthographicCamera(0, 640, 480, 0, 1, 200);
		this._renderTarget = new WebGLRenderTarget(640, 480);
		const mat = new VhsMaterial(this._renderTarget.texture);
		// const mat = new MeshBasicMaterial({
		// 	map: this._renderTarget.texture
		// });

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
			this._dirty = 3;
		};
		label.position.set(320, 480 - 40, __GIU_Z);
		const rectGeo = new PlaneBufferGeometry(420, 32);

		listenForLeadersRefresh(data => {
			this._dirty = 3;
			for (const entry of this._leaderboardEntries) {
				this._scene.remove(entry);
			}
			this._leaderboardEntries.length = 0;
			for (let i = 0; i < data.length; i++) {
				const leader = data[i];
				const entry = new Mesh(
					rectGeo,
					new MeshBasicMaterial({
						transparent: true,
						opacity: 0.2,
						color: COLOR_WHITE,
						depthWrite: false,
						depthTest: false
					})
				);
				entry.material.visible = false;
				const mesh1 = new TextMesh((leader.place + 1).toString(), textSettings.leaderBoardEntryLeft);
				mesh1.onMeasurementsUpdated = () => {
					this._dirty = 3;
				};
				const mesh2 = new TextMesh(leader.summary, textSettings.leaderBoardEntry);
				const mesh3 = new TextMesh(`${(leader.score * 0.01).toFixed(2)}m`, textSettings.leaderBoardEntryRight);
				mesh1.position.x = -200;
				mesh2.position.x = -60;
				mesh3.position.x = 200;
				entry.add(mesh1);
				entry.add(mesh2);
				entry.add(mesh3);
				entry.position.set(320, 480 - 110 - i * 36, __GIU_Z);
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
		this.rayCaster = new Raycaster();
	}
	update(dt: number) {}
	render(renderer: WebGLRenderer) {
		if (this._dirty > 0) {
			this._dirty--;
			renderer.setRenderTarget(this._renderTarget);
			renderer.setClearColor(COLOR_BLACK);
			renderer.clear(true, true, true);
			renderer.render(this._scene, this._camera);
			renderer.setRenderTarget(null);
		}
	}
	projectCursorMove(uv: Vector2) {
		setRayCasterToCameraInUV(this.rayCaster, uv.x, uv.y, this._camera);
		const intersections = this.rayCaster.intersectObjects(this._leaderboardEntries, false);
		if (intersections.length === 0) {
			this.highlightedIndex = -1;
		} else {
			for (const intersection of intersections) {
				const mesh = intersection.object as Mesh<PlaneBufferGeometry, MeshBasicMaterial>;
				this.highlightedIndex = this._leaderboardEntries.indexOf(mesh);
			}
		}
	}
}
