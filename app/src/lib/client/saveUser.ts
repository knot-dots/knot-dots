import type { NewUser, User } from '$lib/models';
import { newUser as newUserSchema, user as userSchema } from '$lib/models';

export default async function saveUser(user: NewUser | User) {
	let url = '/user';
	let method = 'POST';
	if ('guid' in user) {
		url = `/user/${user.guid}`;
		method = 'PUT';
	}

	return await fetch(url, {
		method,
		body: JSON.stringify(newUserSchema.or(userSchema).parse(user)),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
