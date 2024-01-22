import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';
import fetchIsPartOfOptions from '$lib/client/fetchIsPartOfOptions';
import fetchContainers from '$lib/client/fetchContainers';
import fetchContainersWithParentObjectives from '$lib/client/fetchContainersWithParentObjectives';
import fetchHelpBySlug from '$lib/client/fetchHelpBySlug';
import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
import paramsFromURL from '$lib/client/paramsFromURL';
import {
	containerOfType,
	isIndicatorContainer,
	isStrategyContainer,
	payloadTypes,
	status,
	taskStatus
} from '$lib/models';
import type {
	AnyContainer,
	ApplicationState,
	Container,
	ContainerWithObjective,
	OrganizationalUnitContainer,
	OrganizationContainer,
	PayloadType,
	Status,
	TaskStatus
} from '$lib/models';

export const navigationToggle = writable(false);

export const sidebarToggle = writable(true);

export const filtersToggle = writable(true);

export const sortToggle = writable(false);

export const applicationState = writable<ApplicationState>({
	containerDetailView: {
		tabs: []
	},
	containerForm: {
		tabs: []
	}
});

export type User = {
	adminOf: string[];
	familyName: string;
	givenName: string;
	guid: string;
	isAuthenticated: boolean;
	memberOf: string[];
	roles: string[];
};

export const user = derived(
	page,
	(values) => {
		if (values.data.session?.user) {
			return {
				...values.data.session?.user,
				isAuthenticated: true
			};
		} else {
			return {
				adminOf: [],
				familyName: '',
				givenName: '',
				guid: '',
				isAuthenticated: false,
				memberOf: [],
				roles: []
			};
		}
	},
	{
		adminOf: [],
		familyName: '',
		givenName: '',
		guid: '',
		isAuthenticated: false,
		memberOf: [],
		roles: []
	}
);

export const ability = derived(user, defineAbilityFor);

export const dragged = writable<Container | undefined>();

export const getOrganization = derived(page, (values) => {
	return (guid: string): OrganizationContainer =>
		values.data.organizations.find((o: OrganizationContainer) => guid == o.guid);
});

export const getOrganizationalUnit = derived(page, (values) => {
	return (guid: string): OrganizationalUnitContainer =>
		values.data.organizationalUnits.find((o: OrganizationalUnitContainer) => guid == o.guid);
});

export const mayCreateContainer = derived([page, ability], (values) => {
	return (payloadType: PayloadType): boolean => {
		const container = containerOfType(
			payloadType,
			values[0].data.currentOrganization.guid,
			values[0].data.currentOrganizationalUnit?.guid ?? null,
			''
		);
		return values[1].can('create', container);
	};
});

type Overlay = {
	isPartOfOptions: AnyContainer[];
	object?: Container;
	containersWithObjectives?: ContainerWithObjective[];
	relatedContainers: Container[];
	revisions: AnyContainer[];
};

export const overlay = writable<Overlay>({
	isPartOfOptions: [],
	relatedContainers: [],
	revisions: []
});

if (browser) {
	page.subscribe(async (values) => {
		const hashParams = new URLSearchParams(values.url?.hash.substring(1) ?? '');

		if (hashParams.has('create')) {
			const isPartOfOptions = await fetchIsPartOfOptions(
				values.data.currentOrganizationalUnit?.guid ?? values.data.currentOrganization.guid,
				hashParams.get('create') as PayloadType
			);
			const newContainer = containerOfType(
				hashParams.get('create') as PayloadType,
				values.data.currentOrganization.guid,
				values.data.currentOrganizationalUnit?.guid ?? null,
				env.PUBLIC_KC_REALM
			);
			if (newContainer.payload.type == payloadTypes.enum.organizational_unit) {
				newContainer.payload.level = parseInt(paramsFromURL(values.url).get('level') ?? '1');
			} else if (newContainer.payload.type == payloadTypes.enum.measure) {
				newContainer.payload.status =
					(hashParams.get('status') as Status) ?? status.enum['status.idea'];
			} else if (newContainer.payload.type == payloadTypes.enum['internal_objective.task']) {
				newContainer.payload.taskStatus =
					(hashParams.get('taskStatus') as TaskStatus) ?? taskStatus.enum['task_status.idea'];
			}
			overlay.set({
				isPartOfOptions,
				relatedContainers: [],
				revisions: [newContainer] as AnyContainer[]
			});
		} else if (hashParams.has('view-help')) {
			const help = await fetchHelpBySlug(hashParams.get('view-help') as string);
			overlay.update((previous) => ({
				...previous,
				revisions: [help]
			}));
		} else if (hashParams.has('view')) {
			const revisions = await fetchContainerRevisions(hashParams.get('view') as string);
			const container = revisions[revisions.length - 1];

			if (isIndicatorContainer(container)) {
				const [isPartOfOptions, parentObjectives, relatedContainers] = await Promise.all([
					fetchIsPartOfOptions(
						container.organizational_unit ?? container.organization,
						container.payload.type
					),
					fetchContainersWithParentObjectives(container),
					fetchRelatedContainers(container.guid, {
						organization: [container.organization],
						relationType: ['hierarchical']
					})
				]);
				overlay.set({
					isPartOfOptions,
					containersWithObjectives: parentObjectives,
					relatedContainers,
					revisions
				});
			} else if (isStrategyContainer(container)) {
				const relatedContainers = (await fetchContainers({
					isPartOfStrategy: [container.revision]
				})) as Container[];
				overlay.set({
					isPartOfOptions: [],
					relatedContainers,
					revisions
				});
			} else {
				const [isPartOfOptions, relatedContainers] = await Promise.all([
					fetchIsPartOfOptions(
						container.organizational_unit ?? container.organization,
						container.payload.type
					),
					fetchRelatedContainers(container.guid, {
						organization: [container.organization],
						relationType: ['hierarchical']
					})
				]);
				overlay.set({
					isPartOfOptions,
					relatedContainers,
					revisions
				});
			}
		} else if (hashParams.has('relate')) {
			const revisions = await fetchContainerRevisions(hashParams.get('relate') as string);
			overlay.set({
				isPartOfOptions: [],
				object: revisions[0] as Container,
				relatedContainers: [],
				revisions: []
			});
		} else {
			overlay.set({ isPartOfOptions: [], relatedContainers: [], revisions: [] });
		}
	});
}
