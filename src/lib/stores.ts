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
import fetchMembers from '$lib/client/fetchMembers';
import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
import {
	audience,
	containerOfType,
	hasMember,
	type IndicatorContainer,
	isContainerWithEffect,
	isContainerWithObjective,
	isEffectContainer,
	isIndicatorContainer,
	isStrategyContainer,
	isTaskContainer,
	type MeasureContainer,
	type MeasureMonitoringContainer,
	overlayKey,
	paramsFromFragment,
	payloadTypes,
	predicates,
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
	TaskContainer,
	TaskStatus,
	User as UserRecord
} from '$lib/models';

export const applicationState = writable<ApplicationState>({
	containerDetailView: {
		tabs: []
	},
	containerForm: {
		tabs: []
	},
	organizationMenu: {
		showDropDown: false
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
	return (guid: string) => values.data.organizations.find((o) => guid == o.guid);
});

export const getOrganizationalUnit = derived(page, (values) => {
	return (guid: string) => values.data.organizationalUnits.find((o) => guid == o.guid);
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

const storedOverlayWidth = browser ? sessionStorage.getItem('overlayWidth') : null;

export const overlayWidth = writable<number>(
	storedOverlayWidth ? parseFloat(storedOverlayWidth) : 0.65
);

if (browser) {
	overlayWidth.subscribe((value) => sessionStorage.setItem('overlayWidth', value.toString()));
}

const storedRelationOverlayWidth = browser ? sessionStorage.getItem('relationOverlayWidth') : null;

export const relationOverlayWidth = writable<number>(
	storedRelationOverlayWidth ? parseFloat(storedRelationOverlayWidth) : 0.5
);

if (browser) {
	relationOverlayWidth.subscribe((value) =>
		sessionStorage.setItem('relationOverlayWidth', value.toString())
	);
}

type AddEffectState = {
	target?: Container;
	effect?: IndicatorContainer;
};

export const addEffectState = writable<AddEffectState>({});

type Overlay = {
	indicators?: IndicatorContainer[];
	measureElements?: MeasureMonitoringContainer[];
	isPartOfOptions: AnyContainer[];
	containersWithObjectives?: ContainerWithObjective[];
	measures?: MeasureContainer[];
	object?: Container;
	organizations?: OrganizationContainer[];
	organizationalUnits?: OrganizationalUnitContainer[];
	relatedContainers: Container[];
	revisions: AnyContainer[];
	tasks?: TaskContainer[];
	users?: UserRecord[];
};

export const overlay = writable<Overlay>({
	isPartOfOptions: [],
	relatedContainers: [],
	revisions: []
});

export const overlayHistory = writable<URLSearchParams[]>([]);

if (browser) {
	page.subscribe(async (values) => {
		if (!values.url) {
			return;
		}

		const hashParams = paramsFromFragment(values.url);

		if (hashParams.size > 0) {
			if (!hashParams.has(overlayKey.enum.edit)) {
				overlayHistory.update((value) =>
					hashParams.toString() == value[value.length - 1]?.toString() ?? ''
						? value
						: [...value, hashParams]
				);
			}
		} else {
			overlayHistory.set([]);
		}

		if (hashParams.has(overlayKey.enum.create)) {
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
				newContainer.payload.level = parseInt(hashParams.get('level') ?? '1');
			} else if (newContainer.payload.type == payloadTypes.enum.measure) {
				newContainer.payload.status =
					(hashParams.get('status') as Status) ?? status.enum['status.idea'];
			} else if (newContainer.payload.type == payloadTypes.enum.task) {
				newContainer.payload.taskStatus =
					(hashParams.get('taskStatus') as TaskStatus) ?? taskStatus.enum['task_status.idea'];
			}
			if (hashParams.has('copy-of')) {
				const revisions = await fetchContainerRevisions(hashParams.get('copy-of') as string);
				const copyFrom = revisions[revisions.length - 1];
				if (isContainerWithObjective(copyFrom)) {
					newContainer.payload = { ...copyFrom.payload, objective: [] };
				} else if (isContainerWithEffect(copyFrom)) {
					newContainer.payload = { ...copyFrom.payload, effect: [] };
				} else if (isTaskContainer(copyFrom)) {
					newContainer.payload = { ...copyFrom.payload, assignee: undefined };
				} else {
					newContainer.payload = copyFrom.payload;
				}
				newContainer.relation.push({
					object: copyFrom.revision,
					predicate: predicates.enum['is-copy-of'],
					position: 0
				});
			}
			overlay.set({
				isPartOfOptions,
				relatedContainers: [],
				revisions: [newContainer] as AnyContainer[]
			});
		} else if (hashParams.has(overlayKey.enum['view-help'])) {
			const help = await fetchHelpBySlug(hashParams.get(overlayKey.enum['view-help']) as string);
			overlay.update((previous) => ({
				...previous,
				revisions: [help]
			}));
		} else if (hashParams.has(overlayKey.enum.view)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.view) as string
			);
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
						relationType: ['hierarchical', 'other']
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
					category: hashParams.getAll('category'),
					isPartOfStrategy: [container.revision],
					topic: hashParams.getAll('topic')
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
						relationType: ['hierarchical', 'other']
					})
				]);
				overlay.set({
					isPartOfOptions,
					relatedContainers,
					revisions
				});
			}
		} else if (hashParams.has(overlayKey.enum.members)) {
			const [revisions, users] = await Promise.all([
				fetchContainerRevisions(hashParams.get(overlayKey.enum.members) as string),
				fetchMembers(hashParams.get(overlayKey.enum.members) as string)
			]);
			overlay.set({
				isPartOfOptions: [],
				relatedContainers: [],
				revisions,
				users
			});
		} else if (hashParams.has(overlayKey.enum.relations)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.relations) as string
			);
			const container = revisions[revisions.length - 1];
			const relatedContainers = await fetchRelatedContainers(
				hashParams.get(overlayKey.enum.relations) as string,
				{
					audience: hashParams.has('audienceChanged')
						? hashParams.getAll('audience')
						: [audience.enum['audience.public']],
					category: hashParams.getAll('category'),
					organization: [container.organization],
					...(container.organizational_unit
						? { organizationalUnit: [container.organizational_unit] }
						: undefined),
					relationType:
						hashParams.getAll('relationType').length == 0
							? ['hierarchical', 'other']
							: hashParams.getAll('relationType'),
					strategyType: hashParams.getAll('strategyType'),
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				},
				hashParams.get('sort') ?? 'alpha'
			);
			overlay.set({
				isPartOfOptions: [],
				relatedContainers,
				revisions
			});
		} else if (hashParams.has(overlayKey.enum.chapters)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.chapters) as string
			);
			const container = revisions[revisions.length - 1];
			const relatedContainers = await fetchRelatedContainers(
				hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
				{
					audience: hashParams.has('audienceChanged')
						? hashParams.getAll('audience')
						: [audience.enum['audience.public']],
					category: hashParams.getAll('category'),
					organization: [container.organization],
					...(container.organizational_unit
						? { organizationalUnit: [container.organizational_unit] }
						: undefined),
					relationType: hashParams.has('related-to') ? ['hierarchical'] : ['other'],
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				},
				hashParams.get('sort') ?? 'alpha'
			);
			overlay.set({
				isPartOfOptions: [],
				relatedContainers,
				revisions
			});
		} else if (hashParams.has(overlayKey.enum.measures)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum['measures']) as string
			);
			const container = revisions[revisions.length - 1];
			const measures = (await fetchRelatedContainers(
				container.guid,
				{
					audience: hashParams.has('audienceChanged')
						? hashParams.getAll('audience')
						: [audience.enum['audience.public']],
					category: hashParams.getAll('category'),
					measureType: hashParams.getAll('measureType'),
					organization: [container.organization],
					relationType: ['other'],
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				},
				hashParams.get('sort') ?? 'alpha'
			)) as MeasureContainer[];
			overlay.set({
				isPartOfOptions: [],
				measures,
				relatedContainers: [],
				revisions
			});
		} else if (hashParams.has(overlayKey.enum['measure-monitoring'])) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum['measure-monitoring']) as string
			);
			const container = revisions[revisions.length - 1];
			const [measureElements, indicators] = (await Promise.all([
				fetchContainers(
					{
						isPartOfMeasure: [container.revision],
						organization: [container.organization],
						relatedTo: hashParams.getAll('related-to'),
						relationType: ['hierarchical'],
						terms: hashParams.get('terms') ?? ''
					},
					hashParams.get('sort') ?? 'alpha'
				),
				fetchContainers({
					organization: [container.organization],
					payloadType: [payloadTypes.enum.indicator]
				})
			])) as [MeasureMonitoringContainer[], IndicatorContainer[]];
			overlay.set({
				indicators,
				isPartOfOptions: [],
				measureElements,
				relatedContainers: [],
				revisions
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
					payloadType: [
						payloadTypes.enum.measure_result,
						payloadTypes.enum.milestone,
						payloadTypes.enum.task
					],
					taskCategory: hashParams.getAll('taskCategory'),
					terms: hashParams.get('terms') ?? ''
				},
				'priority'
			);
			overlay.set({
				isPartOfOptions: [],
				relatedContainers: containers.filter((c) => !isTaskContainer(c)),
				revisions,
				tasks: containers.filter(isTaskContainer)
			});
		} else if (hashParams.has(overlayKey.enum.indicators)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.indicators) as string
			);
			const container = revisions[revisions.length - 1];
			const [relatedContainers, indicators] = await Promise.all([
				fetchContainers({
					isPartOfStrategy: [container.revision]
				}),
				fetchContainers({
					organization: [container.organization],
					payloadType: [payloadTypes.enum.indicator]
				})
			]);
			const indicatorsFromObjectives = (
				relatedContainers.filter((c) => isContainerWithObjective(c)) as ContainerWithObjective[]
			).flatMap((c) => c.payload.objective.map(({ indicator }) => indicator));
			const indicatorsFromEffects = relatedContainers
				.filter(isEffectContainer)
				.flatMap(({ relation }) => relation)
				.filter(({ predicate }) => predicate == predicates.enum['is-measured-by'])
				.map(({ object }) => object);
			overlay.set({
				indicators: indicators.filter(
					({ guid, revision }) =>
						indicatorsFromObjectives.includes(guid) || indicatorsFromEffects.includes(revision)
				) as IndicatorContainer[],
				isPartOfOptions: [],
				relatedContainers: [],
				revisions
			});
		} else if (hashParams.has(overlayKey.enum.relate)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.relate) as string
			);
			overlay.set({
				isPartOfOptions: [],
				object: revisions[revisions.length - 1] as Container,
				relatedContainers: [],
				revisions: []
			});
		} else if (hashParams.has(overlayKey.enum.profile) && values.data.session) {
			const organizations = values.data.organizations.filter(hasMember(values.data.session.user));
			const organizationalUnits = values.data.organizationalUnits.filter(
				hasMember(values.data.session.user)
			);
			const relatedContainers = (await fetchContainers({
				organization: organizations.map(({ guid }: OrganizationContainer) => guid),
				organizationalUnit: organizationalUnits.map(
					({ guid }: OrganizationalUnitContainer) => guid
				),
				payloadType: [payloadTypes.enum.measure, payloadTypes.enum.strategy, payloadTypes.enum.task]
			})) as Container[];
			overlay.set({
				isPartOfOptions: [],
				organizations,
				organizationalUnits,
				relatedContainers,
				revisions: []
			});
		} else {
			overlay.set({ isPartOfOptions: [], relatedContainers: [], revisions: [] });
		}
	});
}
