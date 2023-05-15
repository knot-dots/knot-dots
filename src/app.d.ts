import type { DatabasePool } from 'slonik';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			pool: DatabasePool;
			user: {
				issuer: string;
				subject: string;
			} | null;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
