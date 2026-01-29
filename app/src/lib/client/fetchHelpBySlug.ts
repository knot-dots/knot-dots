import { helpContainer } from '$lib/models';

export default async function fetchHelpBySlug(slug: string) {
	const response = await fetch(`/help/${slug}`);
	const data = await response.json();
	return helpContainer.parse(data);
}
