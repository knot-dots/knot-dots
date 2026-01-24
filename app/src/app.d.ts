import { type DefaultSession } from '@auth/sveltekit';
import type { DatabasePool } from 'slonik';
import type {
	Container,
	KeycloakUser,
	OrganizationalUnitPayload,
	OrganizationPayload
} from '$lib/models';
import type { CategoryContext } from '$lib/server/categoryOptions';
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
			categoryContext: CategoryContext | null;
			currentOrganization: Container<OrganizationPayload>;
			currentOrganizationalUnit?: Container<OrganizationalUnitPayload>;
			defaultOrganizationGuid: string;
			features: string[];
			organizations: Container<OrganizationPayload>[];
			organizationalUnits: Container<OrganizationalUnitPayload>[];
			session: Session | null;
			user?: KeycloakUser;
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
