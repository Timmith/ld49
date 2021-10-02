import { ContactListener } from "box2d";
import { b2Manifold } from "box2d/build/collision/b2_collision";
import { b2Shape } from "box2d/build/collision/b2_shape";
import { b2Contact } from "box2d/build/dynamics/b2_contact";
import { b2ContactImpulse } from "box2d/build/dynamics/b2_world_callbacks";
import { b2ParticleBodyContact, b2ParticleContact, b2ParticleSystem } from "box2d/build/particle/b2_particle_system";

export default class MetaContactListener extends ContactListener {
	private registry: ContactListener[] = [];

	register(contactListener: ContactListener) {
		this.registry.push(contactListener);
	}

	BeginContact(contact: b2Contact<b2Shape, b2Shape>) {
		for (const cl of this.registry) {
			cl.BeginContact(contact);
		}
	}

	EndContact(contact: b2Contact) {
		for (const cl of this.registry) {
			cl.EndContact(contact);
		}
	}
	BeginContactFixtureParticle(system: b2ParticleSystem, contact: b2ParticleBodyContact) {
		for (const cl of this.registry) {
			cl.BeginContactFixtureParticle(system, contact);
		}
	}
	EndContactFixtureParticle(system: b2ParticleSystem, contact: b2ParticleBodyContact) {
		for (const cl of this.registry) {
			cl.EndContactFixtureParticle(system, contact);
		}
	}
	BeginContactParticleParticle(system: b2ParticleSystem, contact: b2ParticleContact) {
		for (const cl of this.registry) {
			cl.BeginContactParticleParticle(system, contact);
		}
	}
	EndContactParticleParticle(system: b2ParticleSystem, contact: b2ParticleContact) {
		for (const cl of this.registry) {
			cl.EndContactParticleParticle(system, contact);
		}
	}
	PreSolve(contact: b2Contact, oldManifold: b2Manifold) {
		for (const cl of this.registry) {
			cl.PreSolve(contact, oldManifold);
		}
	}
	PostSolve(contact: b2Contact, impulse: b2ContactImpulse) {
		for (const cl of this.registry) {
			cl.PostSolve(contact, impulse);
		}
	}
}
