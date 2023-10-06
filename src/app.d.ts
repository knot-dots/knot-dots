import type { DatabasePool } from 'slonik';
import type { User } from '$lib/stores';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			pool: DatabasePool;
			user: User;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
