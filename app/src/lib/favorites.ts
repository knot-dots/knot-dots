import type { Page } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { type Container, isOrganizationContainer, type OrganizationPayload } from '$lib/models';

/**
 * Returns a URL to store as favorite of the given page.
 *
 * The returned URL uses a format independent of slugs and domains:
 *
 *   knotdots://<organization guid>/<organization or organizational unit guid>/…?<query>
 *
 * The query is normalized so that equal queries compare equal. The hash is dropped, as it
 * holds the state of overlays.
 */
export function createFavoriteURL(page: Page) {
	const { data, params, route, url } = page;
	const search = url.searchParams.toString();
	const pathname =
		route.id?.startsWith('/[guid=uuid]') && params.guid
			? url.pathname.replace(/^\/[^/]+/, `/${params.guid}`)
			: url.pathname;

	return `knotdots://${data.currentOrganization.guid}${pathname}${search ? `?${search}` : ''}`;
}

/**
 * Resolves the URL returned by createFavoriteURL to its canonical form.
 *
 * The URL is that of the base URL with the hostname of the organization:
 * - The default organization is served on the hostname of the base URL.
 * - An organization with custom domain is served on the custom domain.
 * - Other organizations are served on a subdomain of the base URL named after
 *   their slug, or their guid if they have no slug or are unknown.
 * - The guid of the organization or organizational unit in the path is
 *   replaced with its slug, if it has one.
 */
export function resolveFavoriteURL(
	href: string,
	{
		organizations,
		organizationalUnits
	}: Pick<App.PageData, 'organizations' | 'organizationalUnits'>
) {
	if (!URL.canParse(href) || new URL(href).protocol !== 'knotdots:') {
		return href;
	}

	const { hostname: organizationGuid, pathname, search } = new URL(href);
	const baseURL = new URL(env.PUBLIC_BASE_URL);
	const url = new URL(`${pathname || '/'}${search}`, baseURL);

	if (env.PUBLIC_DONT_USE_SUBDOMAINS) {
		return url.toString();
	}

	const organization = organizations.find(({ guid }) => guid === organizationGuid);
	url.hostname = organization
		? hostnameOf(organization, baseURL)
		: `${organizationGuid}.${baseURL.hostname}`;

	// Ensure the organization derived from the subdomain matches the
	// organization derived from the slug. The rewrite hook can only resolve
	// slugified paths in the domain of the corresponding organization.
	const [, contextGuid] = pathname.split('/');
	const container = [...organizations, ...organizationalUnits].find(
		(c) =>
			c.guid === contextGuid &&
			(isOrganizationContainer(c) ? c.guid : c.organization) === organizationGuid
	);

	if (container?.payload.slug) {
		url.pathname = url.pathname.replace(`/${contextGuid}`, `/${container.payload.slug}`);
	}

	return url.toString();
}

function hostnameOf(organization: Container<OrganizationPayload>, baseURL: URL) {
	if (organization.payload.default) {
		return baseURL.hostname;
	} else if (organization.payload.customDomain) {
		return organization.payload.customDomain;
	} else if (organization.payload.slug) {
		return `${organization.payload.slug}.${baseURL.hostname}`;
	} else {
		return `${organization.guid}.${baseURL.hostname}`;
	}
}
