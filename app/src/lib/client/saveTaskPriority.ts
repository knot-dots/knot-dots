import type { TaskPriority } from '$lib/models';

export default async function saveTaskPriority(taskPriority: TaskPriority[]) {
	const url = '/task-priority';

	return await fetch(url, {
		method: 'POST',
		body: JSON.stringify(taskPriority),
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
