<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		isMeasureContainer,
		isSimpleMeasureContainer,
		measureTypes,
		policyFieldBNK,
		predicates,
		programTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets?: Record<string, Record<string, number>> };
	}

	let { children, data }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	let memberFacet = $derived(
		data.containers
			.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
			.flatMap(({ user }) =>
				user
					.filter(({ predicate }) => predicate == predicates.enum['is-member-of'])
					.map(({ subject }) => subject)
			)
			.reduce((accumulator, currentValue) => {
				if (accumulator.has(currentValue)) {
					accumulator.set(currentValue, accumulator.get(currentValue)! + 1);
				} else {
					accumulator.set(currentValue, 1);
				}
				return accumulator;
			}, new Map())
	);

	// Prefer server-provided Elasticsearch facet counts if available; otherwise fall back to local computation.
	// ES facets do not include 'member', 'relationType' or 'included'; we synthesize those locally.
	let facets = $derived.by(() => {
		function fromCounts(options: string[], counts?: Record<string, number>) {
			const m = new Map<string, number>();
			for (const opt of options) m.set(opt, Math.max(0, counts?.[opt] ?? 0));
			if (counts) {
				for (const [k, v] of Object.entries(counts)) if (!m.has(k)) m.set(k, v);
			}
			return m;
		}

		if (data.facets && Object.keys(data.facets).length > 0) {
			const m = new Map<string, Map<string, number>>([
				...((page.url.searchParams.has('related-to')
					? [
							[
								'relationType',
								new Map([
									[predicates.enum['is-consistent-with'], 0],
									[predicates.enum['is-equivalent-to'], 0],
									[predicates.enum['is-inconsistent-with'], 0],
									[predicates.enum['is-prerequisite-for'], 0]
								])
							]
						]
					: []) as Array<[string, Map<string, number>]>),
				...((!page.data.currentOrganization.payload.default
					? [['included', new Map()]]
					: []) as Array<[string, Map<string, number>]>),
				['audience', fromCounts(audience.options as string[], data.facets.audience)],
				['category', fromCounts(sustainableDevelopmentGoals.options as string[], data.facets.category)],
				['topic', fromCounts(topics.options as string[], data.facets.topic)],
				['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data.facets.policyFieldBNK)],
				['measureType', fromCounts(measureTypes.options as string[], data.facets.measureType)],
				['programType', fromCounts(programTypes.options as string[], data.facets.programType)],
				['member', memberFacet]
			]);

			console.log('Using ES-provided facets:', m);
			return m;
		}

		const m = new Map([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-consistent-with'], 0],
								[predicates.enum['is-equivalent-to'], 0],
								[predicates.enum['is-inconsistent-with'], 0],
								[predicates.enum['is-prerequisite-for'], 0]
							])
						]
					]
				: []) as Array<[string, Map<string, number>]>),
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))],
			['programType', new Map(programTypes.options.map((v) => [v as string, 0]))],
			['member', memberFacet]
		]);
		return computeFacetCount(m, data.containers);
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		{@render children()}
	{/snippet}
</Layout>
