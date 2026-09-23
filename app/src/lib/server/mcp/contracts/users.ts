import { z } from 'zod';

export const userName = z.strictObject({
	guid: z.uuid(),
	name: z.string().trim().min(1)
});

export type UserName = z.infer<typeof userName>;

export const searchOrganizationUsersInput = z.strictObject({
	limit: z.number().int().min(1).max(100).default(50).describe('Maximum number of users.'),
	offset: z.number().int().nonnegative().default(0).describe('Offset within matching users.'),
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
	nextOffset: z.number().int().nonnegative().nullable(),
	users: z.array(userName)
});

export type SearchOrganizationUsersOutput = z.infer<typeof searchOrganizationUsersOutput>;
