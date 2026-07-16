import { z } from 'zod';
import { user } from '$lib/models';
import type { User } from '$lib/models';

export default async function fetchMembers(guid: string | string[]): Promise<User[]> {
	const guids = Array.isArray(guid) ? guid : [guid];
	const results = await Promise.all(
		guids.map(async (g) => {
			const response = await fetch(`/container/${g}/user`, {
				credentials: 'include'
			});
			return z.array(user).parse(await response.json());
		})
	);

	const byGuid = new Map<string, User>();
	for (const list of results) {
		for (const member of list) {
			byGuid.set(member.guid, member);
		}
	}
	return [...byGuid.values()];
}
