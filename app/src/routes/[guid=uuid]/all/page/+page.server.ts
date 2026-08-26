import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

export const load = async ({ params, url }) => {
	const newLocation = new URL(url);
	newLocation.pathname = resolve('/[guid=uuid]', params);
	redirect(308, newLocation);
};
