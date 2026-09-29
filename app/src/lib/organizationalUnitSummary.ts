import { z } from 'zod';

export const organizationalUnitSummary = z.strictObject({
	guid: z.uuid(),
	level: z.number().int().positive(),
	name: z.string(),
	organizationGuid: z.uuid(),
	slug: z.string().nullable()
});

export type OrganizationalUnitSummary = z.infer<typeof organizationalUnitSummary>;
