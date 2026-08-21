import DataLoader from 'dataloader';
import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type AnyPayload, type Container, payloadTypes, predicates } from '$lib/models';
import { MAX_PAGE_SIZE } from '$lib/pagination';

// All loads of one render wave share a single request; the shared pool is
// returned to every caller because descendant sets of different parents may
// overlap. Caching is disabled so that a new wave (e.g. after invalidation)
// always fetches fresh data.
export default function createComputedProgressLoader() {
	return new DataLoader<string, Container<AnyPayload>[]>(
		async (guids) => {
			const query = new URLSearchParams();
			for (const type of [
				payloadTypes.enum.progress,
				payloadTypes.enum.goal,
				payloadTypes.enum.measure,
				payloadTypes.enum.simple_measure,
				payloadTypes.enum.task
			]) {
				query.append('type', type);
			}
			for (const guid of [...new Set(guids)].sort()) {
				query.append('relatedTo', guid);
			}
			for (const predicate of [predicates.enum['is-part-of'], predicates.enum['is-section-of']]) {
				query.append('relationType', predicate);
			}

			const { containers } = await fetchContainerPage({
				fetch,
				limit: MAX_PAGE_SIZE,
				offset: 0,
				query
			});

			return guids.map(() => containers);
		},
		{ cache: false }
	);
}
