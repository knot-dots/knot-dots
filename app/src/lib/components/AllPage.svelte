<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import {
		audience,
		computeFacetCount,
		type Container,
		fromCounts,
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
		data: { containers: Container[]; facets: Record<string, Record<string, number>> };
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

	let facets = $derived.by(() => {
		const facets = new Map([
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
			['audience', fromCounts(audience.options, data.facets?.audience)],
			['category', fromCounts(sustainableDevelopmentGoals.options, data.facets?.category)],
			['topic', fromCounts(topics.options, data.facets?.topic)],
			['policyFieldBNK', fromCounts(policyFieldBNK.options, data.facets?.policyFieldBNK)],
			['programType', fromCounts(programTypes.options, data.facets?.programType)]
		]);

		if (!data.facets || Object.keys(data.facets).length === 0) {
			return computeFacetCount(
				facets,
				data.containers.filter(
					(c) =>
						isGoalContainer(c) ||
						isMeasureContainer(c) ||
						isRuleContainer(c) ||
						isSimpleMeasureContainer(c) ||
						isProgramContainer(c)
				)
			);
		}
		return facets;
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
