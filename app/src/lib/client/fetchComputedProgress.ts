import DataLoader from 'dataloader';
import fetchContainers from '$lib/client/fetchContainers';
import { type AnyPayload, type Container, payloadTypes, predicates } from '$lib/models';

// All loads of one render wave share a single request; the shared pool is
// returned to every caller because descendant sets of different parents may
// overlap. Caching is disabled so that a new wave (e.g. after invalidation)
// always fetches fresh data.
const loader = new DataLoader<string, Container<AnyPayload>[]>(
	async (guids) => {
		const containers = await fetchContainers({
			payloadType: [
				payloadTypes.enum.progress,
				payloadTypes.enum.goal,
				payloadTypes.enum.measure,
				payloadTypes.enum.simple_measure,
				payloadTypes.enum.task
			],
			relatedTo: [...new Set(guids)].sort(),
			relationType: [predicates.enum['is-part-of'], predicates.enum['is-section-of']]
		});
		return guids.map(() => containers);
	},
	{ cache: false }
);

export default function fetchComputedProgress(guid: string): Promise<Container<AnyPayload>[]> {
	return loader.load(guid);
}
