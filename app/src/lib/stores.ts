import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { page } from '$app/stores';
import defineAbilityFor from '$lib/authorization';
import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';
import fetchContainers from '$lib/client/fetchContainers';
import fetchHelpBySlug from '$lib/client/fetchHelpBySlug';
import fetchMembers from '$lib/client/fetchMembers';
import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
import {
	type AnyContainer,
	type ApplicationState,
	type Container,
	containerOfType,
	filterMembers,
	type IndicatorContainer,
	type IndicatorTemplateContainer,
	type IooiType,
	isProgramContainer,
	mayDelete,
	type MeasureContainer,
	type NewContainer,
	overlayKey,
	type PageContainer,
	paramsFromFragment,
	type PayloadType,
	payloadTypes,
	predicates,
	type User as UserRecord
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
	iooiType?: IooiType;
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
			key: 'indicator-catalog';
			container: undefined;
			indicators: IndicatorContainer[];
			indicatorTemplates: IndicatorTemplateContainer[];
	  }
	| {
			key: 'new-indicator-catalog';
			container: undefined;
			containers: IndicatorTemplateContainer[];
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
			key: 'content-partners';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'goal-iooi';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'teasers';
			container: AnyContainer;
			containers: Container[];
	  }
	| {
			key: 'view';
			container: AnyContainer;
			revisions: AnyContainer[];
	  }
	| {
			key: 'view-help';
			container: PageContainer;
	  };

export const overlay = writable<OverlayData | undefined>();

export const overlayHistory = writable<URLSearchParams[]>([]);

if (browser) {
	let previousHashState = '';
	let currentHashSequence = 0;

	page.subscribe(async (values) => {
		if (!values.url) {
			return;
		}

		const hashParams = paramsFromFragment(values.url);

		if (hashParams.toString() == previousHashState && !hashParams.has(overlayKey.enum.members)) {
			return;
		}

		previousHashState = hashParams.toString();

		if (hashParams.size > 0) {
			overlayHistory.update((value) =>
				hashParams.toString() == (value[value.length - 1]?.toString() ?? '')
					? value
					: [...value, hashParams]
			);
		} else {
			overlayHistory.set([]);
		}

		currentHashSequence++;
		const thisSequence = currentHashSequence;

		const setOverlayIfLatest = (data: OverlayData | undefined) => {
			if (thisSequence === currentHashSequence) {
				overlay.set(data);
			}
		};

		if (hashParams.has(overlayKey.enum['view-help'])) {
			const help = await fetchHelpBySlug(hashParams.get(overlayKey.enum['view-help']) as string);
			setOverlayIfLatest({
				key: overlayKey.enum['view-help'],
				container: help
			});
		} else if (hashParams.has(overlayKey.enum.view)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.view) as string
			);
			const container = revisions[revisions.length - 1];

			if (isProgramContainer(container)) {
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
			}
			setOverlayIfLatest({
				key: overlayKey.enum.view,
				container,
				revisions
			});
		} else if (hashParams.has(overlayKey.enum.members)) {
			const [revisions, users] = (await Promise.all([
				fetchContainerRevisions(hashParams.get(overlayKey.enum.members) as string),
				fetchMembers(hashParams.get(overlayKey.enum.members) as string)
			])) as [Container[], UserRecord[]];
			setOverlayIfLatest({
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
					predicates.enum['implies'],
					predicates.enum['is-inconsistent-with'],
					predicates.enum['is-prerequisite-for'],
					predicates.enum['is-sub-target-of'],
					predicates.enum['is-superordinate-of']
				]
			})) as Container[];
			setOverlayIfLatest({
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
			setOverlayIfLatest({ key: overlayKey.enum.chapters, container, containers });
		} else if (hashParams.has(overlayKey.enum['content-partners'])) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum['content-partners']) as string
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
			setOverlayIfLatest({ key: overlayKey.enum['content-partners'], container, containers });
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
					relationType: [predicates.enum['is-part-of-program']],
					terms: hashParams.get('terms') ?? '',
					topic: hashParams.getAll('topic')
				},
				hashParams.get('sort') ?? 'alpha'
			)) as MeasureContainer[];
			setOverlayIfLatest({
				key: overlayKey.enum.measures,
				container,
				containers: filterMembers(containers, hashParams.getAll('member'))
			});
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
			setOverlayIfLatest({
				key: overlayKey.enum['measure-monitoring'],
				container,
				containers
			});
		} else if (hashParams.has(overlayKey.enum['goal-iooi'])) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum['goal-iooi']) as string
			);
			const container = revisions[revisions.length - 1];
			const containers = await fetchRelatedContainers(
				hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
				{
					organization: [container.organization],
					payloadType: [payloadTypes.enum.goal, payloadTypes.enum.objective],
					relationType: [predicates.enum['is-part-of'], predicates.enum['is-objective-for']],
					terms: hashParams.get('terms') ?? ''
				},
				hashParams.get('sort') ?? 'alpha'
			);
			setOverlayIfLatest({ key: overlayKey.enum['goal-iooi'], container, containers });
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
			setOverlayIfLatest({ key: overlayKey.enum.tasks, container, containers });
		} else if (hashParams.has(overlayKey.enum.indicators)) {
			const revisions = (await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.indicators) as string
			)) as Container[];
			const container = revisions[revisions.length - 1];
			const relatedContainers = (await fetchContainers({
				isPartOfProgram: [container.guid]
			})) as Container[];
			setOverlayIfLatest({
				key: overlayKey.enum.indicators,
				container,
				containers: relatedContainers
			});
		} else if (hashParams.has(overlayKey.enum['indicator-catalog'])) {
			const indicatorTemplates = (await fetchContainers({
				category: hashParams.getAll('category'),
				indicatorCategory: hashParams.getAll('indicatorCategory'),
				indicatorType: hashParams.getAll('indicatorType'),
				measureType: hashParams.getAll('measureType'),
				payloadType: [payloadTypes.enum.indicator_template],
				topic: hashParams.getAll('topic')
			})) as IndicatorTemplateContainer[];
			const indicators = (await fetchContainers({
				category: hashParams.getAll('category'),
				indicatorCategory: hashParams.getAll('indicatorCategory'),
				indicatorType: hashParams.getAll('indicatorType'),
				measureType: hashParams.getAll('measureType'),
				organization: [values.data.currentOrganization.guid],
				payloadType: [payloadTypes.enum.indicator],
				topic: hashParams.getAll('topic')
			})) as IndicatorContainer[];
			setOverlayIfLatest({
				key: overlayKey.enum['indicator-catalog'],
				container: undefined,
				indicators,
				indicatorTemplates
			});
		} else if (hashParams.has(overlayKey.enum['new-indicator-catalog'])) {
			const containers = (await fetchContainers({
				category: hashParams.getAll('category'),
				indicatorCategory: hashParams.getAll('indicatorCategory'),
				indicatorType: hashParams.getAll('indicatorType'),
				measureType: hashParams.getAll('measureType'),
				payloadType: [payloadTypes.enum.indicator_template],
				topic: hashParams.getAll('topic')
			})) as IndicatorTemplateContainer[];
			setOverlayIfLatest({
				key: overlayKey.enum['new-indicator-catalog'],
				container: undefined,
				containers
			});
		} else if (hashParams.has(overlayKey.enum.teasers)) {
			const revisions = await fetchContainerRevisions(
				hashParams.get(overlayKey.enum.teasers) as string
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
			setOverlayIfLatest({ key: overlayKey.enum.teasers, container, containers });
		} else {
			setOverlayIfLatest(undefined);
		}
	});
}
