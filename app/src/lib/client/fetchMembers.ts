import { z } from 'zod';
import { user } from '$lib/models';
import type { User } from '$lib/models';

export default async function fetchMembers(guid: string): Promise<User[]> {
	const response = await fetch(`/container/${guid}/user`, {
		credentials: 'include'
	});

	return z.array(user).parse(await response.json());
}
