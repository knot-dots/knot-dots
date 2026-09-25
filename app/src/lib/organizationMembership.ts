import { z } from 'zod';
import { memberRoles } from '$lib/models';

export const organizationMembership = z.strictObject({
	guid: z.uuid(),
	name: z.string(),
	role: memberRoles,
	slug: z.string().nullable()
});

export type OrganizationMembership = z.infer<typeof organizationMembership>;
