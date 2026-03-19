<script lang="ts">
	import { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import InfoCircle from '~icons/flowbite/info-circle-solid';
	import fetchContainers from '$lib/client/fetchContainers';
	import SearchToolbar from '$lib/components/SearchToolbar.svelte';
	import SingleChoiceSelectableCardSet from '$lib/components/SingleChoiceSelectableCardSet.svelte';
	import {
		computeFacetCount,
		indicatorCategories,
		type IndicatorTemplateContainer,
		indicatorTemplateContainer,
		indicatorTypes,
		payloadTypes,
		sustainableDevelopmentGoals
	} from '$lib/models';

	interface Props {
		onSelect: (container: IndicatorTemplateContainer) => void;
		value?: IndicatorTemplateContainer;
	}

	let { onSelect, value }: Props = $props();

	let filter = $state({
		sdg: [],
		indicatorCategory: [],
		indicatorType: []
	}) as Record<string, string[]>;

	let sort = $state('alpha');

	let terms = $state('');

	const searchResource = resource(
		[
			() => filter.sdg,
			() => filter.indicatorCategory,
			() => filter.indicatorType,
			() => sort,
			() => terms
		],
		async ([sdg, indicatorCategory, indicatorType, sort, terms], _, { signal }) => {
			const response = await fetchContainers(
				{
					sdg,
					indicatorCategory,
					indicatorType,
					payloadType: [payloadTypes.enum.indicator_template],
					terms
				},
				sort,
				{ signal }
			);
			return z.array(indicatorTemplateContainer).parse(response);
		},
		{
			debounce: 300
		}
	);

	let facets = $derived.by(() => {
		const facets = new Map([
			['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['indicatorTypes', new Map(indicatorTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, searchResource.current ?? []);
	});
</script>

<SearchToolbar
	bind:filter
	bind:sort
	bind:terms
	{facets}
	sortOptions={[
		[$_('sort_alphabetically'), 'alpha'],
		[$_('sort_modified'), 'modified']
	]}
>
	{#snippet extraPrimaryContent()}
		<span class="prompt"><InfoCircle /> {$_('create_effect_dialog.prompt')}</span>
	{/snippet}
</SearchToolbar>

<div class="search-result">
	{#if searchResource.current}
		<SingleChoiceSelectableCardSet {onSelect} options={searchResource.current ?? []} {value} />
	{/if}
</div>

<style>
	.prompt {
		align-items: center;
		background-color: var(--color-yellow-050);
		border: solid 1px var(--color-yellow-200);
		border-radius: 8px;
		color: var(--color-yellow-900);
		display: flex;
		font-size: 0.875rem;
		gap: 0.375rem;
		line-height: 1.25;
		padding: 0.375rem 1rem 0.375rem 0.5rem;
	}

	.prompt > :global(svg) {
		color: var(--color-yellow-500);
		height: 1.5rem;
		width: 1.5rem;
	}

	.search-result {
		margin-top: 1rem;
		overflow-y: auto;
	}
</style>
