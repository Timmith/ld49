import {
	AdditiveBlending,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	OrthographicCamera,
	PlaneBufferGeometry,
	Raycaster,
	Scene,
	Vector2,
	WebGLRenderer,
	WebGLRenderTarget
} from "three";
import TestGraphics3D from "~/helpers/scenes/TestGraphics3D";
import { WorldData } from "~/helpers/types";
import { getCameraSlideDurationForLevel } from "~/helpers/utils/getCameraSlideDurationForLevel";
import { getDetails, getLeaders, Leader, listenForLeadersRefresh } from "~/leaderboard";
import { VhsMaterial } from "~/materials/VhsMaterial";
import { delay } from "~/physics/utils/asyncUtils";
import { setRayCasterToCameraInUV } from "~/physics/utils/rayCastUtils";
import { __GIU_Z } from "~/settings/constants";
import TextMesh from "~/text/TextMesh";
import { textSettings } from "~/text/TextSettings";
import { ButtonUserData } from "~/ui/SimpleGUIOverlay";
import { COLOR_BLACK, COLOR_WHITE } from "~/utils/colorLibrary";
import { changeCursor } from "~/utils/cursorUtil";

class LeaderButtonUserData extends ButtonUserData {
	constructor(node: Object3D, public leader: Leader) {
		super(node);
	}
}
export default class LeaderBoard {
	mesh: Mesh;
	private _scene: Scene;
	private _camera: OrthographicCamera;
	private _renderTarget: WebGLRenderTarget;
	private _leaderboardEntries: Array<Mesh<PlaneBufferGeometry, MeshBasicMaterial>> = [];
	private _dirty = true;

	private rayCaster: Raycaster;
	private _highlightedIndex: number = -1;
	private _labelLeaderboard: TextMesh;
	private _labelPleaseWait: TextMesh;
	private _leaderGameStateData: Promise<WorldData> | undefined;
	private _gameConsole: TestGraphics3D | undefined;
	get highlightedIndex(): number {
		return this._highlightedIndex;
	}
	set highlightedIndex(value: number) {
		if (this._highlightedIndex !== value) {
			if (this._highlightedIndex !== -1 && this._leaderboardEntries.length > 0) {
				this._leaderboardEntries[this._highlightedIndex].material.visible = false;
			}
			this._highlightedIndex = value;
			if (this._highlightedIndex !== -1) {
				this._leaderboardEntries[this._highlightedIndex].material.visible = true;
			}
			this._dirty = true;
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
		const labelLeaderBoard = new TextMesh("LEADERBOARD", textSettings.leaderBoardTitle);
		labelLeaderBoard.onMeasurementsUpdated = () => {
			this._dirty = true;
		};
		labelLeaderBoard.position.set(320, 480 - 40, __GIU_Z);

		const labelPleaseWait = new TextMesh("PLEASE WAIT...", textSettings.leaderBoardEntry);
		labelPleaseWait.onMeasurementsUpdated = () => {
			this._dirty = true;
		};
		labelPleaseWait.position.set(320, 240, __GIU_Z);

		const rectGeo = new PlaneBufferGeometry(420, 32);
		listenForLeadersRefresh(data => {
			this._dirty = true;
			setTimeout(() => {
				this._dirty = true;
			}, 1000);
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
				const buttonData = new LeaderButtonUserData(entry, leader);
				buttonData.registerHitCallback(data => this.selectedLeaderboardEntry(data));
				entry.userData = buttonData;
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
				entry.position.set(320, 480 - 110 - i * 36, __GIU_Z);
				this._leaderboardEntries.push(entry);
				this._scene.add(entry);
			}
		});
		this.resetLeaders();

		this._scene.add(labelLeaderBoard);
		this._labelLeaderboard = labelLeaderBoard;

		this._scene.add(labelPleaseWait);
		labelPleaseWait.visible = false;
		this._labelPleaseWait = labelPleaseWait;

		this.rayCaster = new Raycaster();
	}
	resetLeaders() {
		try {
			getLeaders(10);
		} catch (e) {
			console.warn("leaderboard not available, hiding mesh");
			this.mesh.visible = false;
		}
	}
	async selectedLeaderboardEntry(data: LeaderButtonUserData) {
		if (this._leaderGameStateData) {
			return; //already loading or loaded
		}
		this._leaderGameStateData = getDetails(data.leader.id);
		this._labelPleaseWait.visible = true;
		this._labelLeaderboard.visible = false;
		for (const entry of this._leaderboardEntries) {
			entry.parent!.remove(entry);
		}
		this._leaderboardEntries.length = 0;
		this._dirty = true;
		const gameState = await this._leaderGameStateData;
		this._labelPleaseWait.visible = false;
		const gameConsole = new TestGraphics3D(
			() => false,
			() => false
		);
		this._gameConsole = gameConsole;
		await gameConsole.testB2World.loadGame(gameState);
		await delay(getCameraSlideDurationForLevel(gameState.player.currentLevel) + 8000);
		this._gameConsole = undefined;
		this._leaderGameStateData = undefined;
		this._labelLeaderboard.visible = true;
		this._dirty = true;
		this.resetLeaders();
	}
	update(dt: number) {
		if (this._gameConsole) {
			this._gameConsole.update(dt);
		}
	}
	render(renderer: WebGLRenderer) {
		if (this._dirty || this._gameConsole) {
			this._dirty = false;
			renderer.setRenderTarget(this._renderTarget);
			renderer.setClearColor(COLOR_BLACK);
			renderer.clear(true, true, true);
			renderer.render(this._scene, this._camera);
			if (this._gameConsole) {
				this._gameConsole.render(renderer);
			}
			renderer.setRenderTarget(null);
		}
	}
	projectCursorMove(uv: Vector2) {
		setRayCasterToCameraInUV(this.rayCaster, uv.x, uv.y, this._camera);
		const intersections = this.rayCaster.intersectObjects(this._leaderboardEntries, false);
		if (intersections.length === 0) {
			this.highlightedIndex = -1;
			changeCursor(undefined, 3);
		} else {
			for (const intersection of intersections) {
				const mesh = intersection.object as Mesh<PlaneBufferGeometry, MeshBasicMaterial>;
				this.highlightedIndex = this._leaderboardEntries.indexOf(mesh);
			}
			changeCursor("pointer", 3);
		}
	}
	projectCursorStart(uv: Vector2) {
		setRayCasterToCameraInUV(this.rayCaster, uv.x, uv.y, this._camera);
		const intersections = this.rayCaster.intersectObjects(this._leaderboardEntries, false);
		for (const intersection of intersections) {
			const mesh = intersection.object as Mesh<PlaneBufferGeometry, MeshBasicMaterial>;
			if (mesh.userData instanceof ButtonUserData) {
				mesh.userData.hit();
				break; //only hit the first one
			}
		}
	}
}
