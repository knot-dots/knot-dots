import { z } from 'zod';
import { organizationalUnitSummary } from '$lib/organizationalUnitSummary';
import { nextOffset, paginationInput } from '$lib/server/mcp/contracts/pagination';

export const listOrganizationalUnitsInput = z.strictObject({
	...paginationInput('organizational units'),
	organizationGuid: z.uuid().describe('Organization whose organizational units should be listed.')
});

export type ListOrganizationalUnitsInput = z.infer<typeof listOrganizationalUnitsInput>;

export const listOrganizationalUnitsOutput = z.strictObject({
	nextOffset,
	organizationalUnits: z.array(organizationalUnitSummary)
});

export type ListOrganizationalUnitsOutput = z.infer<typeof listOrganizationalUnitsOutput>;
