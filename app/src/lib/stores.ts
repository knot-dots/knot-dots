import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';
import fetchContainers from '$lib/client/fetchContainers';
import fetchContainersByUser from '$lib/client/fetchContainersByUser';
import fetchHelpBySlug from '$lib/client/fetchHelpBySlug';
import fetchMembers from '$lib/client/fetchMembers';
import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
import {
	type AnyContainer,
	type ApplicationState,
	type Container,
	containerOfType,
	createCopyOf,
	type IndicatorContainer,
	isIndicatorContainer,
	isStrategyContainer,
	mayDelete,
	type MeasureContainer,
	type PageContainer,
	overlayKey,
	paramsFromFragment,
	type PayloadType,
	payloadTypes,
	predicates,
	resolutionStatus,
	type ResolutionStatus,
	type Status,
	status,
	type TaskStatus,
	taskStatus,
	type User as UserRecord,
	type NewContainer
} from '$lib/models';

export const applicationState = writable<ApplicationState>({
	containerDetailView: {
		editable: false,
		mode: 'view_mode.preview'
	}
});

export type User = {
	adminOf: string[];
	collaboratorOf: string[];
	familyName: string;
	givenName: string;
	guid: string;
	headOf: string[];
	isAuthenticated: boolean;
	memberOf: string[];
	roles: string[];
	settings: {
		features?: string[];
	};
};

export const user = derived(
	page,
	(values): User => {
		if (values.data.session?.user) {
			return {
				...values.data.session?.user,
				isAuthenticated: true
			};
		} else {
			return {
				adminOf: [],
				collaboratorOf: [],
				familyName: '',
				givenName: '',
				guid: '',
				headOf: [],
				isAuthenticated: false,
				memberOf: [],
				roles: [],
				settings: {}
			};
		}
	},
	{
		adminOf: [],
		collaboratorOf: [],
		familyName: '',
		givenName: '',
		guid: '',
		headOf: [],
		isAuthenticated: false,
		memberOf: [],
		roles: [],
		settings: {}
	}
);

export const ability = derived(user, defineAbilityFor);

export const dragged = writable<Container | undefined>();

export const getOrganization = derived(page, (values) => {
	return (guid: string) => values.data.organizations.find((o) => guid == o.guid);
});

export const getOrganizationalUnit = derived(page, (values) => {
	return (guid: string) => values.data.organizationalUnits.find((o) => guid == o.guid);
});

export const mayCreateContainer = derived([page, ability], (values) => {
	return (payloadType: PayloadType, managedBy: string): boolean => {
		const container = containerOfType(
			payloadType,
			values[0].data.currentOrganization.guid,
			values[0].data.currentOrganizationalUnit?.guid ?? null,
			managedBy,
			''
		);
		return values[1].can('create', container);
	};
});

export const mayDeleteContainer = derived(ability, (values) => {
	return (container: AnyContainer): boolean => {
		return mayDelete(container, values) || values.can('delete-recursively', container);
	};
});

const storedOverlayWidth = browser ? sessionStorage.getItem('overlayWidth') : null;

export const overlayWidth = writable<number>(
	storedOverlayWidth ? parseFloat(storedOverlayWidth) : 0.65
);

if (browser) {
	overlayWidth.subscribe((value) => sessionStorage.setItem('overlayWidth', value.toString()));
}

type AddEffectState = {
	target?: Container;
	effect?: IndicatorContainer;
};

export const addEffectState = writable<AddEffectState>({});

type AddObjectiveState = {
	target?: Container;
	indicator?: IndicatorContainer;
};

export const addObjectiveState = writable<AddObjectiveState>({});

export const newContainer = writable<NewContainer | undefined>();

export type OverlayData =
	| {
			key: 'chapters';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'create';
			container: AnyContainer;
			relatedContainers: Container[];
	  }
	| {
			key: 'edit';
			container: AnyContainer;
			relatedContainers: Container[];
	  }
	| {
			key: 'edit-help';
			container: PageContainer;
	  }
	| {
			key: 'indicators';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'measure-monitoring';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'measures';
			container: AnyContainer;
			containers: MeasureContainer[];
	  }
	| {
			key: 'members';
			container: AnyContainer;
			users: UserRecord[];
	  }
	| {
			key: 'relations';
			container: Container;
			relatedContainers: Container[];
	  }
	| {
			key: 'tasks';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'view';
			container: AnyContainer;
			revisions: AnyContainer[];
			relatedContainers: Container[];
	  }
	| {
			key: 'view-help';
			container: PageContainer;
	  };

export const overlay = writable<OverlayData | undefined>();

export const overlayHistory = writable<URLSearchParams[]>([]);

if (browser) {
	let previousHashState = '';

	page.subscribe(async (values) => {
		if (!values.url) {
			return;
		}

		const hashParams = paramsFromFragment(values.url);

		if (hashParams.toString() == previousHashState) {
			return;
		}

		previousHashState = hashParams.toString();

		if (hashParams.size > 0) {
			if (!hashParams.has(overlayKey.enum.edit) && !hashParams.has(overlayKey.enum.create)) {
				overlayHistory.update((value) =>
					hashParams.toString() == (value[value.length - 1]?.toString() ?? '')
						? value
						: [...value, hashParams]
				);
			}
		} else {
			overlayHistory.set([]);
		}

		if (hashParams.has(overlayKey.enum.create)) {
			let newContainer = containerOfType(
				hashParams.get('create') as PayloadType,
				values.data.currentOrganization.guid,
				values.data.currentOrganizationalUnit?.guid ?? null,
				hashParams.has('managed-by')
					? (hashParams.get('managed-by') as string)
					: (values.data.currentOrganizationalUnit?.guid ?? values.data.currentOrganization.guid),
				env.PUBLIC_KC_REALM as string
			);
			if (newContainer.payload.type == payloadTypes.enum.organizational_unit) {
				newContainer.payload.level = parseInt(hashParams.get('level') ?? '1');
			} else if (newContainer.payload.type == payloadTypes.enum.measure) {
				newContainer.payload.status =
					(hashParams.get('status') as Status) ?? status.enum['status.idea'];
			} else if (newContainer.payload.type == payloadTypes.enum.resolution) {
				newContainer.payload.resolutionStatus =
					(hashParams.get('resolutionStatus') as ResolutionStatus) ??
					resolutionStatus.enum['resolution_status.draft'];
			} else if (newContainer.payload.type == payloadTypes.enum.task) {
				newContainer.payload.taskStatus =
					(hashParams.get('taskStatus') as TaskStatus) ?? taskStatus.enum['task_status.idea'];
			}
			if (hashParams.has('copy-of')) {
				const revisions = await fetchContainerRevisions(hashParams.get('copy-of') as string);
				const organizationalUnit = values.data.organizationalUnits.find(
					(o) => values.data.session?.user.adminOf[0] == o.guid
				);
				let organization;
				if (organizationalUnit) {
					organization = organizationalUnit.organization;
				} else {
					organization = values.data.organizations.find(
						(o) => values.data.session?.user.adminOf[0] == o.guid
					)?.guid as string;
				}
				newContainer = createCopyOf(
					revisions[revisions.length - 1] as Container,
					organization,
					organizationalUnit?.guid ?? null
				);
			}
			applicationState.update((state) => ({
				...state,
				containerDetailView: { ...state.containerDetailView, editable: true }
			}));
			overlay.set({
				key: overlayKey.enum.create,
				container: newContainer as AnyContainer,
				relatedContainers: []
			});
		} else if (hashParams.has(overlayKey.enum['view-help'])) {
			const help = await fetchHelpBySlug(hashParams.get(overlayKey.enum['view-help']) as string);
			overlay.set({
				key: hashParams.has(overlayKey.enum['edit-help'])
					? overlayKey.enum['edit-help']
					: overlayKey.enum['view-help'],
				container: help
			});
		} else if (hashParams.has(overlayKey.enum.view)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.view) as string
			);
			const container = revisions[revisions.length - 1];

			if (isIndicatorContainer(container)) {
				const relatedContainers = await fetchRelatedContainers(container.guid, {
					organization: [container.organization],
					...(hashParams.has('strategy')
						? { strategy: [hashParams.get('strategy') as string] }
						: undefined)
				});
				overlay.set({
					key: hashParams.has(overlayKey.enum.edit) ? overlayKey.enum.edit : overlayKey.enum.view,
					container,
					relatedContainers,
					revisions
				});
			} else if (isStrategyContainer(container)) {
				const relatedContainers = (await fetchContainers({
					category: hashParams.getAll('category'),
					isPartOfStrategy: [container.guid],
					policyFieldBNK: hashParams.getAll('policyFieldBNK'),
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				})) as Container[];
				overlay.set({
					key: hashParams.has(overlayKey.enum.edit) ? overlayKey.enum.edit : overlayKey.enum.view,
					container,
					relatedContainers,
					revisions
				});
				if (hashParams.has('table')) {
					applicationState.update((state) => ({
						...state,
						containerDetailView: {
							...state.containerDetailView,
							mode: 'view_mode.table'
						}
					}));
				} else {
					applicationState.update((state) => ({
						...state,
						containerDetailView: {
							...state.containerDetailView,
							mode: 'view_mode.preview'
						}
					}));
				}
			} else {
				const relatedContainers = await fetchRelatedContainers(container.guid, {
					organization: [container.organization],
					relationType: [
						predicates.enum['is-consistent-with'],
						predicates.enum['is-equivalent-to'],
						predicates.enum['is-inconsistent-with'],
						predicates.enum['is-measured-by'],
						predicates.enum['is-objective-for'],
						predicates.enum['is-part-of']
					]
				});
				overlay.set({
					key: hashParams.has(overlayKey.enum.edit) ? overlayKey.enum.edit : overlayKey.enum.view,
					container,
					relatedContainers,
					revisions
				});
			}
		} else if (hashParams.has(overlayKey.enum.members)) {
			const [revisions, users] = (await Promise.all([
				fetchContainerRevisions(hashParams.get(overlayKey.enum.members) as string),
				fetchMembers(hashParams.get(overlayKey.enum.members) as string)
			])) as [Container[], UserRecord[]];
			overlay.set({
				key: overlayKey.enum.members,
				container: revisions[revisions.length - 1],
				users
			});
		} else if (hashParams.has(overlayKey.enum.relations)) {
			const revisions = (await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.relations) as string
			)) as Container[];
			const container = revisions[revisions.length - 1];
			const relatedContainers = (await fetchRelatedContainers(container.guid, {
				relationType: [
					predicates.enum['contributes-to'],
					predicates.enum['is-affected-by'],
					predicates.enum['is-concrete-target-of'],
					predicates.enum['is-consistent-with'],
					predicates.enum['is-duplicate-of'],
					predicates.enum['is-equivalent-to'],
					predicates.enum['is-inconsistent-with'],
					predicates.enum['is-prerequisite-for'],
					predicates.enum['is-sub-target-of'],
					predicates.enum['is-subtask-of'],
					predicates.enum['is-superordinate-of']
				]
			})) as Container[];
			overlay.set({
				key: overlayKey.enum.relations,
				container,
				relatedContainers
			});
		} else if (hashParams.has(overlayKey.enum.chapters)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.chapters) as string
			);
			const container = revisions[revisions.length - 1];
			const containers = (await fetchRelatedContainers(
				hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
				{
					audience: hashParams.getAll('audience'),
					category: hashParams.getAll('category'),
					organization: [container.organization],
					...(hashParams.has('related-to')
						? { relationType: [predicates.enum['is-part-of']] }
						: {}),
					policyFieldBNK: hashParams.getAll('policyFieldBNK'),
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				},
				hashParams.get('sort') ?? 'alpha'
			)) as Container[];
			overlay.set({ key: overlayKey.enum.chapters, container, containers });
		} else if (hashParams.has(overlayKey.enum.measures)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum['measures']) as string
			);
			const container = revisions[revisions.length - 1];
			const containers = (await fetchRelatedContainers(
				hashParams.get(overlayKey.enum['measures']) as string,
				{
					audience: hashParams.getAll('audience'),
					category: hashParams.getAll('category'),
					measureType: hashParams.getAll('measureType'),
					organization: [container.organization],
					policyFieldBNK: hashParams.getAll('policyFieldBNK'),
					relationType: [predicates.enum['is-part-of-strategy']],
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				},
				hashParams.get('sort') ?? 'alpha'
			)) as MeasureContainer[];
			overlay.set({ key: overlayKey.enum.measures, container, containers });
		} else if (hashParams.has(overlayKey.enum['measure-monitoring'])) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum['measure-monitoring']) as string
			);
			const container = revisions[revisions.length - 1];
			const containers = (await fetchRelatedContainers(
				hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
				{
					organization: [container.organization],
					...(hashParams.has('related-to')
						? { relationType: [predicates.enum['is-part-of']] }
						: {}),
					terms: hashParams.get('terms') ?? '',
					payloadType: [
						payloadTypes.enum.effect,
						payloadTypes.enum.indicator,
						payloadTypes.enum.goal,
						payloadTypes.enum.measure,
						payloadTypes.enum.simple_measure,
						payloadTypes.enum.task
					]
				},
				hashParams.get('sort') ?? 'alpha'
			)) as Container[];
			overlay.set({
				key: overlayKey.enum['measure-monitoring'],
				container,
				containers
			});
		} else if (hashParams.has(overlayKey.enum.tasks)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.tasks) as string
			);
			const container = revisions[revisions.length - 1];
			const containers = await fetchRelatedContainers(
				hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
				{
					assignee: hashParams.getAll('assignee'),
					payloadType: [payloadTypes.enum.goal, payloadTypes.enum.task],
					taskCategory: hashParams.getAll('taskCategory'),
					terms: hashParams.get('terms') ?? ''
				},
				'priority'
			);
			overlay.set({ key: overlayKey.enum.tasks, container, containers });
		} else if (hashParams.has(overlayKey.enum.indicators)) {
			const revisions = (await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.indicators) as string
			)) as Container[];
			const container = revisions[revisions.length - 1];
			const relatedContainers = (await fetchContainers({
				isPartOfStrategy: [container.guid]
			})) as Container[];
			overlay.set({
				key: overlayKey.enum.indicators,
				container,
				containers: relatedContainers
			});
		} else {
			overlay.set(undefined);
		}
	});
}
