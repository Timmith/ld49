import { Contact, ContactListener, Fixture } from "box2d";
import { translateCategoryBitsToString } from "~/physics/utils/physicsUtils";

import { queueDestruction } from "../managers/destructionManager";

export default class BaseContactListener extends ContactListener {
	static readonly k_maxContactPoints: number = 2048;

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
			architectureHitsPenalty(fixtureA, fixtureB);
		} else if (fixtB_category === "architecture" && fixtA_category === "penalty") {
			architectureHitsPenalty(fixtureB, fixtureA);
		}
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
}
function architectureHitsPenalty(architectureFixt: Fixture, penaltyFixt: Fixture) {
	queueDestruction(architectureFixt);
	console.log("You have incurred a penalty!!");
}
