import type { Reroute } from '@sveltejs/kit';
import { isReservedContextSlug } from '$lib/models';

type RewriteOrganization = {
	guid: string;
	slug?: string | null;
};

type RewriteOrganizationalUnit = {
	guid: string;
	organization: string;
	slug?: string | null;
};

type RewriteData = {
	currentOrganizationGuid: string | null;
	organizations: RewriteOrganization[];
	organizationalUnits: RewriteOrganizationalUnit[];
};

type RewriteLookup = {
	organizationsByIdentifier: Map<string, string>;
	organizationalUnitsByOrganization: Map<string, Map<string, string>>;
	currentOrganizationGuid: string | null;
};

function normalizeIdentifier(value: string) {
	return value.trim().toLowerCase();
}

function createRewriteLookup(data: RewriteData): RewriteLookup {
	const organizationsByIdentifier = new Map<string, string>();
	const organizationalUnitsByOrganization = new Map<string, Map<string, string>>();

	for (const organization of data.organizations) {
		const normalizedGuid = normalizeIdentifier(organization.guid);
		organizationsByIdentifier.set(normalizedGuid, organization.guid);

		if (organization.slug) {
			organizationsByIdentifier.set(normalizeIdentifier(organization.slug), organization.guid);
		}
	}

	for (const organizationalUnit of data.organizationalUnits) {
		const normalizedOrganizationGuid = normalizeIdentifier(organizationalUnit.organization);
		const organizationUnits =
			organizationalUnitsByOrganization.get(normalizedOrganizationGuid) ??
			new Map<string, string>();

		organizationUnits.set(normalizeIdentifier(organizationalUnit.guid), organizationalUnit.guid);

		if (organizationalUnit.slug) {
			organizationUnits.set(normalizeIdentifier(organizationalUnit.slug), organizationalUnit.guid);
		}

		organizationalUnitsByOrganization.set(normalizedOrganizationGuid, organizationUnits);
	}

	return {
		organizationsByIdentifier,
		organizationalUnitsByOrganization,
		currentOrganizationGuid: data.currentOrganizationGuid
	};
}

async function getRewriteLookup(fetch: typeof globalThis.fetch) {
	const response = await fetch('/rewrite-map');

	if (!response.ok) {
		return;
	}

	const data = (await response.json()) as RewriteData;
	return createRewriteLookup(data);
}

export const reroute: Reroute = async ({ fetch, url }) => {
	if (url.pathname.startsWith('/rewrite-map')) {
		return;
	}

	if (url.pathname === '/') {
		return;
	}

	const segments = url.pathname.split('/').filter(Boolean);
	if (segments.length === 0) {
		return;
	}

	const [firstSegment, ...restSegments] = segments;
	if (isReservedContextSlug(firstSegment)) {
		return;
	}

	const rewriteLookup = await getRewriteLookup(fetch);
	if (!rewriteLookup) {
		return;
	}

	const organizationGuid = rewriteLookup.organizationsByIdentifier.get(
		normalizeIdentifier(firstSegment)
	);
	if (organizationGuid) {
		const rewrittenPathname = `/${[organizationGuid, ...restSegments].join('/')}`;
		if (rewrittenPathname !== url.pathname) {
			return rewrittenPathname;
		}
		return;
	}

	if (rewriteLookup.currentOrganizationGuid) {
		const organizationalUnits = rewriteLookup.organizationalUnitsByOrganization.get(
			normalizeIdentifier(rewriteLookup.currentOrganizationGuid)
		);
		const organizationalUnitGuid = organizationalUnits?.get(normalizeIdentifier(firstSegment));

		if (organizationalUnitGuid) {
			const rewrittenPathname = `/${[organizationalUnitGuid, ...restSegments].join('/')}`;
			if (rewrittenPathname !== url.pathname) {
				return rewrittenPathname;
			}
		}
	}

	return;
};
