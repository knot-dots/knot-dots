import { z } from 'zod';
import { anyContainer } from '$lib/models';

export default async function fetchContainerRevisions(guid: string) {
	const response = await fetch(`/container/${guid}/revision`);
	const data = await response.json();
	return z.array(anyContainer).parse(data);
}
