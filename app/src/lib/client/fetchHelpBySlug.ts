import { z } from 'zod';
import { type HelpSlug, helpContainer } from '$lib/models';

export default async function fetchHelpBySlug(slug: HelpSlug) {
	const response = await fetch(`/help/${slug}`);
	const data = await response.json();
	return z.array(helpContainer).parse(data);
}
