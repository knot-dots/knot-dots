import type { Session } from '@auth/core/types';
import type { DatabasePool } from 'slonik';
import type { KeycloakUser, OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';
import type { User } from '$lib/stores';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			featureDecisions: Record<string, () => boolean>;
			pool: DatabasePool;
			user: User;
		}
		interface PageData {
			currentOrganization: OrganizationContainer;
			currentOrganizationalUnit: OrganizationalUnitContainer | undefined;
			organizations: OrganizationContainer[];
			organizationalUnits: OrganizationalUnitContainer[];
			random: number;
			session: Session;
			user?: KeycloakUser;
		}
		// interface Platform {}
	}
}

declare module '@auth/core/types' {
	interface User {
		email: string;
		familyName: string;
		givenName: string;
		id: string;
	}

	interface Session {
		user: {
			adminOf: string[];
			email: string;
			familyName: string;
			givenName: string;
			guid: string;
			memberOf: string[];
			roles: string[];
		};
	}
}

export {};
