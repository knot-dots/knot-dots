import { z } from 'zod';

export function paginationInput(items: string) {
	return {
		limit: z.number().int().min(1).max(100).default(50).describe(`Maximum number of ${items}.`),
		offset: z.number().int().nonnegative().default(0).describe(`Offset within matching ${items}.`)
	};
}

export const nextOffset = z
	.number()
	.int()
	.nonnegative()
	.nullable()
	.describe('Offset of the next page, or null if there are no more results.');
