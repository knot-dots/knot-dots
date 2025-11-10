<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		isGoalContainer,
		isMeasureContainer,
		isProgramContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		policyFieldBNK,
		predicates,
		programTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';

	interface Props {
		children: Snippet;
		data: { containers: Container[]; facets?: unknown };
	}

	let { children, data }: Props = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['contributes-to']
		]
	});

	// normalize counts coming from server (object or Map) into a Map<string, number>
	function toMap(counts: unknown): Map<string, number> {
		const m = new Map<string, number>();
		if (!counts) return m;
		if (counts instanceof Map) {
			for (const [k, v] of counts) m.set(k as string, Number(v));
			return m;
		}
		if (typeof counts === 'object') {
			for (const [k, v] of Object.entries(counts as Record<string, number>)) m.set(k, Number(v));
		}
		return m;
	}

	function fromCounts(options: readonly string[], counts: unknown): Map<string, number> {
		const base = new Map<string, number>(options.map((v) => [v as string, 0]));
		const src = toMap(counts);
		for (const [k, v] of src) base.set(k, v);
		return base;
	}

	let facets = $derived.by(() => {
		const filtered = data.containers.filter(
			(c) =>
				isGoalContainer(c) ||
				isMeasureContainer(c) ||
				isRuleContainer(c) ||
				isSimpleMeasureContainer(c) ||
				isProgramContainer(c)
		);

		if (data.facets) {
			// Prefer server-provided facets, ensure complete option sets, and synthesize local-only facets
			const base = new Map<string, Map<string, number>>([
				['audience', fromCounts(audience.options, (data.facets as any)['audience'])],
				['category', fromCounts(sustainableDevelopmentGoals.options, (data.facets as any)['category'])],
				['topic', fromCounts(topics.options, (data.facets as any)['topic'])],
				['policyFieldBNK', fromCounts(policyFieldBNK.options, (data.facets as any)['policyFieldBNK'])],
				['programType', fromCounts(programTypes.options, (data.facets as any)['programType'])]
			]);

			// Local-only synthesized facets
			const localOnly = new Map<string, Map<string, number>>([
				...((page.url.searchParams.has('related-to')
					? [
							[
								'relationType',
								new Map([
									[predicates.enum['is-part-of'], 0],
									[predicates.enum['is-consistent-with'], 0],
									[predicates.enum['is-equivalent-to'], 0],
									[predicates.enum['is-inconsistent-with'], 0],
									[predicates.enum['contributes-to'], 0]
								])
							]
						]
					: []) as Array<[string, Map<string, number>]>),
				...((!page.data.currentOrganization.payload.default
					? [['included', new Map()]]
					: []) as Array<[string, Map<string, number>]>)
			]);

			if (localOnly.size > 0) {
				const computed = computeFacetCount(localOnly, filtered);
				for (const [k, v] of computed) base.set(k, v);
			}

			return base;
		}

		// Fallback: compute all facets on client
		const all = new Map<string, Map<string, number>>([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-part-of'], 0],
								[predicates.enum['is-consistent-with'], 0],
								[predicates.enum['is-equivalent-to'], 0],
								[predicates.enum['is-inconsistent-with'], 0],
								[predicates.enum['contributes-to'], 0]
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
			['programType', new Map(programTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(all, filtered);
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
