import { Body, Contact, ContactListener, Fixture, Vec2 } from "box2d";
import { playWorldSound } from "~/audio/sounds";
import { translateCategoryBitsToString } from "~/physics/utils/physicsUtils";
import { removeFromArray } from "~/utils/arrayUtils";
import { taskTimer } from "~/utils/taskTimer";
import { queueDestruction } from "../managers/destructionManager";

export default class BaseContactListener extends ContactListener {
	static readonly k_maxContactPoints: number = 2048;

	BeginContact(contact: Contact) {
		const fixtureA = contact.GetFixtureA();
		const fixtureB = contact.GetFixtureB();
		const tcbts = translateCategoryBitsToString;
		const fixtA_category = tcbts(fixtureA.m_filter.categoryBits);
		const fixtB_category = tcbts(fixtureB.m_filter.categoryBits);


	}

	EndContact(contact: Contact) {
		//console.log("ContactEnded");
		const fixtureA = contact.GetFixtureA();
		const fixtureB = contact.GetFixtureB();
		const tcbts = translateCategoryBitsToString;
		const fixtA_category = tcbts(fixtureA.m_filter.categoryBits);
		const fixtB_category = tcbts(fixtureB.m_filter.categoryBits);


	}
}
