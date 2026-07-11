import { z } from 'zod';
import { createContainerSchema, helpPayload, type HelpSlug } from '$lib/models';

export default async function fetchHelpBySlug(slug: HelpSlug) {
	const response = await fetch(`/help/${slug}`);
	const data = await response.json();
	return z.array(createContainerSchema(helpPayload)).parse(data);
}
