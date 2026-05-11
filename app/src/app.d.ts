import { type DefaultSession } from '@auth/sveltekit';
import type { DatabasePool } from 'slonik';
import type { CategoryContext } from '$lib/categoryOptions';
import type { KeycloakUser, OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
import type { User } from '$lib/stores';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			features: string[];
			pool: DatabasePool;
			user: User;
		}
		interface PageData {
			categoryContext: CategoryContext;
			currentOrganization: OrganizationContainer;
			currentOrganizationalUnit?: OrganizationalUnitContainer;
			defaultOrganizationGuid: string;
			features: string[];
			organizations: OrganizationContainer[];
			organizationalUnits: OrganizationalUnitContainer[];
			session: Session | null;
			user?: KeycloakUser;
		}
		interface PageState {
			createObjectiveOrEffect?: { step: 1 | 2 | 3 };
		}
		// interface Platform {}
	}
}

declare module '@auth/sveltekit' {
	interface Session {
		user: {
			adminOf: string[];
			collaboratorOf: string[];
			email: string;
			familyName: string;
			givenName: string;
			guid: string;
			headOf: string[];
			memberOf: string[];
			roles: string[];
			settings: { features?: string[] };
		} & DefaultSession['user'];
	}
}

export {};
