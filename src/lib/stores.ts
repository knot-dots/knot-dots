import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';
import fetchIsPartOfOptions from '$lib/client/fetchIsPartOfOptions';
import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
import paramsFromURL from '$lib/client/paramsFromURL';
import type {
	AnyContainer,
	ApplicationState,
	Container,
	PayloadType,
	Status,
	TaskStatus
} from '$lib/models';
import { containerOfType, payloadTypes, status, taskStatus } from '$lib/models';

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

export const user = derived(page, (values) => {
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
});

export const ability = derived(user, defineAbilityFor);

export const dragged = writable<Container | undefined>();

type Overlay = {
	isPartOfOptions: AnyContainer[];
	object?: Container;
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
		} else if (hashParams.has('view')) {
			const revisions = await fetchContainerRevisions(hashParams.get('view') as string);
			const container = revisions[revisions.length - 1];
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
		} else if (hashParams.has('relate')) {
			overlay.set({
				isPartOfOptions: [],
				object: values.data.containers.find(
					({ guid }: AnyContainer) => guid == hashParams.get('relate')
				),
				relatedContainers: [],
				revisions: []
			});
		} else {
			overlay.set({ isPartOfOptions: [], relatedContainers: [], revisions: [] });
		}
	});
}
