import { trace, type Span } from '@opentelemetry/api';
import { error } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { type AnyContainer, type KeycloakUser } from '$lib/models';
import type { OrganizationContainer } from '$lib/models';
import {
	getManyOrganizationalUnitContainers,
	getManyOrganizationContainers,
	setUp
} from '$lib/server/db';
import { findUserById } from '$lib/server/keycloak';
import type { LayoutServerLoad } from './$types';

const tracer = trace.getTracer('app');

export const load: LayoutServerLoad = async ({ locals, url }) =>
	tracer.startActiveSpan('layout.load', async (span: Span) => {
		let currentOrganization;
		let user: KeycloakUser | undefined = undefined;

		async function filterVisibleAsync<T extends AnyContainer>(promise: Promise<Array<T>>) {
			const containers = await promise;
			return filterVisible(containers, locals.user);
		}

		const [organizations, organizationalUnits] = await Promise.all([
			filterVisibleAsync(locals.pool.connect(getManyOrganizationContainers({}, 'alpha'))),
			filterVisibleAsync(locals.pool.connect(getManyOrganizationalUnitContainers({})))
		]);

		if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
			currentOrganization = organizations.find(({ payload }) => payload.default);
			if (!currentOrganization) {
				currentOrganization = (await locals.pool.connect(
					setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
				)) as OrganizationContainer;
			}
		} else {
			currentOrganization = organizations.find(({ guid }) => url.hostname.startsWith(`${guid}.`));
		}

		if (!currentOrganization) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		if (url.searchParams.has('signup')) {
			try {
				const foundUser = await findUserById(url.searchParams.get('signup') as string);
				if (!foundUser.emailVerified) {
					user = foundUser;
				}
			} catch (error) {
				log.warn(isErrorLike(error) ? serializeError(error) : {}, String(error));
			}
		}

		span.end();

		return {
			currentOrganization,
			features: locals.features,
			organizations,
			organizationalUnits,
			session: await locals.auth(),
			user
		};
	});
