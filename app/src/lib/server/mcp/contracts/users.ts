import { z } from 'zod';
import { nextOffset, paginationInput } from '$lib/server/mcp/contracts/pagination';

export const userName = z.strictObject({
	guid: z.uuid(),
	name: z.string().trim().min(1)
});

export type UserName = z.infer<typeof userName>;

export const searchOrganizationUsersInput = z.strictObject({
	...paginationInput('users'),
	organizationGuid: z.uuid().describe('Organization whose members should be searched.'),
	terms: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.optional()
		.describe('Optional case-insensitive display-name search.')
});

export type SearchOrganizationUsersInput = z.infer<typeof searchOrganizationUsersInput>;

export const searchOrganizationUsersOutput = z.strictObject({
	nextOffset,
	users: z.array(userName)
});

export type SearchOrganizationUsersOutput = z.infer<typeof searchOrganizationUsersOutput>;
