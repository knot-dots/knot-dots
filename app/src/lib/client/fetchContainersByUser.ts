import { z } from 'zod';
import { anyContainer } from '$lib/models';

export default async function fetchContainersByUser(guid: string) {
	const response = await fetch(`/user/${guid}/container`);
	const data = await response.json();
	return z.array(anyContainer).parse(data);
}
