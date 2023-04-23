import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { isContainerType } from '$lib/models';
import type { SustainableDevelopmentGoal } from '$lib/models';
import { createContainer } from '$lib/server/db';
import type { Actions } from './$types';

export const actions = {
	default: async ({ locals, params, request }) => {
		if (!isContainerType(params.type)) {
			throw error(404, {
				message: 'Unknown container type'
			});
		}

		const data = await request.formData();
		const payload = {
			category: data.get('category') as SustainableDevelopmentGoal,
			description: data.get('description') as string,
			title: data.get('title') as string
		};
		const user = [
			{
				issuer: 'https://keycloak.dev.dotstory.de/realms/knot-dots',
				subject: '959FAEA9-6E7E-4F17-A584-05E49EC249B6'
			}
		];
		await locals.pool.connect(
			createContainer({
				payload,
				type: params.type,
				realm: env.PUBLIC_KC_REALM ?? '',
				user
			})
		);

		throw redirect(303, '/');
	}
} satisfies Actions;
