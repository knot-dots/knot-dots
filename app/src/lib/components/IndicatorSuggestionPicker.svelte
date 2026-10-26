<script lang="ts">
	import { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import InfoCircle from '~icons/flowbite/info-circle-solid';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import fetchSuggestedContainers from '$lib/client/fetchSuggestedContainers';
	import RelevanceBadge from '$lib/components/RelevanceBadge.svelte';
	import SearchToolbar from '$lib/components/SearchToolbar.svelte';
	import SingleChoiceSelectableCardSet from '$lib/components/SingleChoiceSelectableCardSet.svelte';
	import {
		type BinaryIndicatorPayload,
		computeFacetCount,
		type Container,
		type GoalPayload,
		indicatorCategories,
		type IndicatorPayload,
		indicatorTypes,
		isEffectContainer,
		type MeasurePayload,
		payloadTypes
	} from '$lib/models';

	interface Props {
		onSelect: (container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>) => void;
		target: Container<GoalPayload | MeasurePayload>;
		value?: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
	}

	let { onSelect, target, value }: Props = $props();

	const categoryContext = $derived(
		filterCategoryContext(page.data.categoryContext, [payloadTypes.enum.indicator])
	);

	let filter = $state<Record<string, string[]>>({
		...Object.fromEntries(categoryContext.keys.map((k) => [k, []])),
		indicatorCategory: [],
		indicatorType: []
	});

	let terms = $state('');

	const searchResource = resource(
		[() => $state.snapshot(filter), () => terms],
		async ([filter, terms], _, { signal }) => {
			if (target) {
				return fetchSuggestedContainers(
					target.guid,
					{ ...filter, organization: [page.data.currentOrganization.guid], terms },
					{ signal }
				);
			}
		},
		{
			debounce: 300
		}
	);

	let suggestions = $derived(searchResource.current ?? []);

	let options = $derived(suggestions.map(({ indicator }) => indicator));

	let relevanceByGuid = $derived(
		new Map(suggestions.map(({ indicator, relevance }) => [indicator.guid, relevance]))
	);

	let facets = $derived.by(() => {
		const facets = new Map([
			...buildCategoryFacetsWithCounts(categoryContext.options),
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, options);
	});
</script>

<SearchToolbar bind:filter bind:terms {categoryContext} {facets}>
	{#snippet extraPrimaryContent()}
		<span class="prompt">
			<InfoCircle />
			{#if isEffectContainer(target)}
				{$_('create_effect_dialog.prompt_effect')}
			{:else}
				{$_('create_effect_dialog.prompt_objective')}
			{/if}
		</span>
	{/snippet}
</SearchToolbar>

<div class="search-result">
	{#if searchResource.current}
		<SingleChoiceSelectableCardSet {onSelect} {options} {value}>
			{#snippet optionFooter(option)}
				<RelevanceBadge score={relevanceByGuid.get(option.guid) ?? 0} />
			{/snippet}
		</SingleChoiceSelectableCardSet>
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
