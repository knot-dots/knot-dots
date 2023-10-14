import type { NewUser } from '$lib/models';
import { newUser } from '$lib/models';

export default async function saveUser(user: NewUser) {
	return await fetch('/user', {
		method: 'POST',
		body: JSON.stringify(newUser.parse(user)),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
