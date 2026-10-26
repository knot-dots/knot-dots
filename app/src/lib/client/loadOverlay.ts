import { preloadData } from '$app/navigation';
import { resolve } from '$app/paths';
import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';
import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
import {
	type AnyPayload,
	type Container,
	filterMembers,
	type Grant,
	type InheritedMatrixSection,
	type MeasurePayload,
	overlayKey,
	payloadTypes,
	predicates,
	type User
} from '$lib/models';
import { extractCustomCategoryFiltersFromParams } from '$lib/utils/customCategoryFilters';

export type OverlayData =
	| {
			key: 'chapters';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'indicators';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'measure-monitoring';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'measures';
			container: Container<AnyPayload>;
			containers: Container<MeasurePayload>[];
	  }
	| {
			key: 'members';
			admins?: User[];
			container: Container<AnyPayload>;
			grants: Grant[];
			inheritedSections?: InheritedMatrixSection[];
			mayManageOrganizationUsers?: boolean;
			users: User[];
	  }
	| {
			key: 'relations';
			container: Container;
			relatedContainers: Container[];
	  }
	| {
			key: 'tasks';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'goal-iooi';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'measure-iooi';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'resources';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'table';
			container: Container<AnyPayload>;
			containers: Container[];
	  }
	| {
			key: 'templates';
			container: Container<AnyPayload>;
			containers: Container[];
			facets: Map<string, Map<string, number>>;
	  }
	| {
			key: 'view';
			container: Container<AnyPayload>;
			revisions: Container<AnyPayload>[];
			sections: Container[];
	  };

class OverlayLoadError extends Error {}

// preloadData() resolves with the status and data of the current page when loading fails,
// so the data is checked for the container that was requested.
function assertLoaded<T extends { type: string; status?: number; data?: Record<string, unknown> }>(
	result: T,
	guid: string
): asserts result is Extract<T, { type: 'loaded' }> {
	const container = result.data?.container as Container | undefined;
	if (result.type !== 'loaded' || result.status !== 200 || container?.guid !== guid) {
		throw new OverlayLoadError(`Loading overlay data failed with status ${result.status}`);
	}
}

// Loads the data of the overlay requested by the hash parameters; resolves with undefined if the
// hash requests no overlay and rejects if loading the data failed.
export default async function loadOverlay(
	data: App.PageData,
	hashParams: URLSearchParams
): Promise<OverlayData | undefined> {
	if (hashParams.has(overlayKey.enum.view)) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum.view) as string
			})
		);
		assertLoaded(result, hashParams.get(overlayKey.enum.view) as string);
		const { container, revisions, sections } = result.data;
		return {
			key: overlayKey.enum.view,
			container,
			revisions,
			sections
		};
	} else if (hashParams.has(overlayKey.enum.members)) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/all/members', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum.members) as string
			})
		);
		assertLoaded(result, hashParams.get(overlayKey.enum.members) as string);
		return {
			key: overlayKey.enum.members,
			admins: result.data.admins,
			container: result.data.container,
			grants: result.data.grants,
			inheritedSections: result.data.inheritedSections,
			mayManageOrganizationUsers: result.data.mayManageOrganizationUsers,
			users: result.data.users
		};
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
		return {
			key: overlayKey.enum.relations,
			container,
			relatedContainers
		};
	} else if (hashParams.has(overlayKey.enum.chapters)) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/all/level', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum.chapters) as string
			}) +
				'?' +
				hashParams.toString()
		);
		assertLoaded(result, hashParams.get(overlayKey.enum.chapters) as string);
		return {
			key: overlayKey.enum.chapters,
			container: result.data.container,
			containers: result.data.containers
		};
	} else if (hashParams.has(overlayKey.enum.table)) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/all/table', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum.table) as string
			}) +
				'?' +
				hashParams.toString()
		);
		assertLoaded(result, hashParams.get(overlayKey.enum.table) as string);
		return {
			key: overlayKey.enum.table,
			container: result.data.container,
			containers: result.data.containers
		};
	} else if (hashParams.has(overlayKey.enum.measures)) {
		const revisions = await fetchContainerRevisions(
			hashParams.get(overlayKey.enum['measures']) as string
		);
		const container = revisions[revisions.length - 1];
		const containers = (await fetchRelatedContainers(
			hashParams.get(overlayKey.enum['measures']) as string,
			{
				...extractCustomCategoryFiltersFromParams(hashParams, data.categoryContext.keys),
				organization: [container.organization],
				payloadType: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
				relationType: [predicates.enum['is-part-of-program']],
				terms: hashParams.get('terms') ?? ''
			},
			hashParams.get('sort') ?? 'alpha'
		)) as Container<MeasurePayload>[];
		return {
			key: overlayKey.enum.measures,
			container,
			containers: filterMembers(containers, hashParams.getAll('member'))
		};
	} else if (hashParams.has(overlayKey.enum['measure-monitoring'])) {
		const revisions = await fetchContainerRevisions(
			hashParams.get(overlayKey.enum['measure-monitoring']) as string
		);
		const container = revisions[revisions.length - 1];
		const containers = (await fetchRelatedContainers(
			hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
			{
				organization: [container.organization],
				...(hashParams.has('related-to') ? { relationType: [predicates.enum['is-part-of']] } : {}),
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
		return {
			key: overlayKey.enum['measure-monitoring'],
			container,
			containers
		};
	} else if (hashParams.has(overlayKey.enum['goal-iooi'])) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/iooi/board', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum['goal-iooi']) as string
			})
		);
		assertLoaded(result, hashParams.get(overlayKey.enum['goal-iooi']) as string);
		return {
			key: overlayKey.enum['goal-iooi'],
			container: result.data.container,
			containers: result.data.containers
		};
	} else if (hashParams.has(overlayKey.enum['measure-iooi'])) {
		const revisions = await fetchContainerRevisions(
			hashParams.get(overlayKey.enum['measure-iooi']) as string
		);
		const container = revisions[revisions.length - 1];
		const containers = await fetchRelatedContainers(
			hashParams.has('related-to') ? (hashParams.get('related-to') as string) : container.guid,
			{
				organization: [container.organization],
				payloadType: [
					payloadTypes.enum.effect,
					payloadTypes.enum.indicator,
					payloadTypes.enum.resource_data,
					payloadTypes.enum.resource_data_collection
				],
				relationType: [predicates.enum['is-part-of'], predicates.enum['is-section-of']],
				terms: hashParams.get('terms') ?? ''
			},
			hashParams.get('sort') ?? 'alpha'
		);
		return {
			key: overlayKey.enum['measure-iooi'],
			container,
			containers
		};
	} else if (hashParams.has(overlayKey.enum.tasks)) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/tasks/status', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum.tasks) as string
			}) +
				'?' +
				hashParams.toString()
		);
		assertLoaded(result, hashParams.get(overlayKey.enum.tasks) as string);
		return {
			key: overlayKey.enum.tasks,
			container: result.data.container,
			containers: result.data.containers
		};
	} else if (hashParams.has(overlayKey.enum.indicators)) {
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/indicators/catalog', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: hashParams.get(overlayKey.enum.indicators) as string
			}) +
				'?' +
				hashParams.toString()
		);
		assertLoaded(result, hashParams.get(overlayKey.enum.indicators) as string);
		return {
			key: overlayKey.enum.indicators,
			container: result.data.container,
			containers: result.data.containers
		};
	} else if (hashParams.has(overlayKey.enum.resources)) {
		const programGuid = hashParams.get(overlayKey.enum.resources) as string;

		// Preload for fullscreen and overlay is the same for resources, so we can use the same logic
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/resources/catalog', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: programGuid
			}) +
				'?' +
				hashParams.toString()
		);

		assertLoaded(result, programGuid);

		return {
			key: overlayKey.enum.resources,
			container: result.data.container,
			containers: result.data.containers
		};
	} else if (hashParams.has(overlayKey.enum.templates)) {
		const programGuid = hashParams.get(overlayKey.enum.templates) as string;

		// Preload for fullscreen and overlay is the same for templates, so we can use the same logic
		const result = await preloadData(
			resolve('/[guid=uuid]/[contentGuid=uuid]/templates/catalog', {
				guid: (data.currentOrganizationalUnit ?? data.currentOrganization).guid,
				contentGuid: programGuid
			}) +
				'?' +
				hashParams.toString()
		);

		assertLoaded(result, programGuid);

		return {
			key: overlayKey.enum.templates,
			container: result.data.container,
			containers: result.data.containers,
			facets: result.data.facets
		};
	}

	return undefined;
}
