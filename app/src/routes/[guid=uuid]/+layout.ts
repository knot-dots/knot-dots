import { get } from 'svelte/store';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { browser } from '$app/environment';
import { type AnyPayload, type Container } from '$lib/models';
import { lastUpdatedContainers } from '$lib/stores';
import type { LayoutLoad } from './$types';

function pageTitle(routeId: string | null) {
	// Parameters such as [contentGuid=uuid] are skipped, so that the views of a
	// container are titled like those of an organization.
	const [workspaceType, workspaceView] = (routeId ?? '')
		.split('/')
		.filter((segment) => segment && !segment.startsWith('['));

	if (!workspaceType || !workspaceView) {
		return '';
	}

	return unwrapFunctionStore(_)('workspace.' + workspaceType + '.title');
}

// Returns the version of the container saved in the browser since the server load
// fetched it, if any. Saving the favorites raises the revision of the loaded container
// without updating its payload (see Sidebar.svelte), so a saved version of the same
// revision takes precedence.
function latest<T extends Container<AnyPayload>>(container: T) {
	const saved = get(lastUpdatedContainers).get(container.guid);
	return saved && saved.revision >= container.revision ? (saved as T) : container;
}

export const load = (async ({ data, parent, route }) => {
	// The root layout load waits for the messages of the locale.
	await parent();

	// The server load reads neither the route nor the URL, so it only reruns when the guid
	// in the path changes or the organization or organizational unit is invalidated. Until
	// then, its data keeps the organizations and organizational units as they were loaded.
	// This load reruns whenever the route changes, since it reads the route for the title,
	// and takes over the versions saved in the meantime, such as after renaming the current
	// organization.
	const context = browser
		? {
				...data,
				currentOrganization: latest(data.currentOrganization),
				currentOrganizationalUnit: data.currentOrganizationalUnit
					? latest(data.currentOrganizationalUnit)
					: data.currentOrganizationalUnit,
				defaultOrganization: latest(data.defaultOrganization),
				organizations: data.organizations.map((organization) => latest(organization)),
				organizationalUnits: data.organizationalUnits.map((unit) => latest(unit))
			}
		: data;

	return { ...context, title: pageTitle(route.id) };
}) satisfies LayoutLoad;
