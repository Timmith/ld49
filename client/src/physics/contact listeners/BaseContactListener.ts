import { Body, Contact, ContactListener, Fixture } from "box2d";
import { translateCategoryBitsToString } from "~/physics/utils/physicsUtils";

import { queueDestruction } from "../managers/destructionManager";

export default class BaseContactListener extends ContactListener {
	static readonly k_maxContactPoints: number = 2048;
	private _healthChangeCallbacks: Array<(healthDelta: number) => void> = [];
	private _bodiesThatHit: Body[] = [];

	listenForHealthChanges(healthChangeCallback: (healthDelta: number) => void) {
		this._healthChangeCallbacks.push(healthChangeCallback);
	}

	BeginContact(contact: Contact) {
		const fixtureA = contact.GetFixtureA();
		const fixtureB = contact.GetFixtureB();
		const tcbts = translateCategoryBitsToString;
		const fixtA_category = tcbts(fixtureA.m_filter.categoryBits);
		const fixtB_category = tcbts(fixtureB.m_filter.categoryBits);

		////////////////////////////////////////////////
		///// ARCHITECTURE AND PENALTY COLLISION /////
		////////////////////////////////////////////////
		if (fixtA_category === "architecture" && fixtB_category === "penalty") {
			this._architectureHitsPenalty(fixtureA, fixtureB);
		} else if (fixtB_category === "architecture" && fixtA_category === "penalty") {
			this._architectureHitsPenalty(fixtureB, fixtureA);
		}

		// if (fixtA_category === "architecture" && fixtB_category === "goal") {
		// 	architectureHitsGoal(fixtureA, fixtureB);
		// } else if (fixtB_category === "architecture" && fixtA_category === "goal") {
		// 	architectureHitsGoal(fixtureB, fixtureA);
		// }
	}

	EndContact(contact: Contact) {
		//console.log("ContactEnded");
		const fixtureA = contact.GetFixtureA();
		const fixtureB = contact.GetFixtureB();
		const tcbts = translateCategoryBitsToString;
		const fixtA_category = tcbts(fixtureA.m_filter.categoryBits);
		const fixtB_category = tcbts(fixtureB.m_filter.categoryBits);
		if (fixtA_category === fixtB_category) {
			//
		}
	}

	private _architectureHitsPenalty(architectureFixt: Fixture, penaltyFixt: Fixture) {
		const body = architectureFixt.GetBody();

		if (!this._bodiesThatHit.includes(body)) {
			for (const cb of this._healthChangeCallbacks) {
				cb(-1);
			}
			queueDestruction(architectureFixt);
		}

		this._bodiesThatHit.push(body);
	}
}

// function architectureHitsGoal(fixtureA: Fixture, fixtureB: Fixture) {

// 	throw new Error("Function not implemented.");

// }
