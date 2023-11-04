import { z } from 'zod';
import { anyContainer } from '$lib/models';
import type { PayloadType } from '$lib/models';

export default async function fetchIsPartOfOptions(
	organizationOrOrganizationalUnit: string,
	payloadType: PayloadType
) {
	const params = new URLSearchParams([
		['organization', organizationOrOrganizationalUnit],
		['payloadType', payloadType]
	]);
	const response = await fetch(`/maybe-part-of?${params}`);
	const data = await response.json();
	return z.array(anyContainer).parse(data);
}
