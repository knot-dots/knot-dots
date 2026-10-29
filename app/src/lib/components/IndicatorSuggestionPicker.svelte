<script lang="ts">
	import { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import InfoCircle from '~icons/flowbite/info-circle-solid';
	import { page } from '$app/state';
	import { buildCategoryFacetsWithCounts, filterCategoryContext } from '$lib/categoryOptions';
	import fetchSuggestedContainers from '$lib/client/fetchSuggestedContainers';
	import OrganizationFilterDropDown from '$lib/components/OrganizationFilterDropDown.svelte';
	import SearchToolbar from '$lib/components/SearchToolbar.svelte';
	import SingleChoiceSelectableCardSet from '$lib/components/SingleChoiceSelectableCardSet.svelte';
	import {
		binaryIndicatorPayload,
		type BinaryIndicatorPayload,
		computeFacetCount,
		type Container,
		createContainerSchema,
		type GoalPayload,
		indicatorCategories,
		indicatorPayload,
		type IndicatorPayload,
		indicatorTypes,
		isEffectContainer,
		type MeasurePayload,
		type OrganizationalUnitPayload,
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

	let scopeType = $state<'current' | 'all' | 'explicit'>('all');
	let includeSubordinateOrganizationalUnits = $state(true);
	let checkedOrganizations = $state<string[]>([]);
	let checkedOrganizationalUnits = $state<string[]>([]);

	let organizationOptions = $derived(
		page.data.organizations.map(({ guid, payload }) => ({
			value: guid,
			label: payload.name,
			subOptions: page.data.organizationalUnits
				.filter(
					(organizationalUnit: Container<OrganizationalUnitPayload>) =>
						organizationalUnit.organization === guid
				)
				.map((organizationalUnit) => ({
					value: organizationalUnit.guid,
					label: organizationalUnit.payload.name
				}))
		}))
	);

	const searchResource = resource(
		[() => $state.snapshot(filter), () => terms],
		async ([filter, terms], _, { signal }) => {
			if (target) {
				return z
					.array(
						z.union([
							createContainerSchema(indicatorPayload),
							createContainerSchema(binaryIndicatorPayload)
						])
					)
					.parse(
						await fetchSuggestedContainers(
							target.guid,
							{ ...filter, organization: [page.data.currentOrganization.guid], terms },
							{ signal }
						)
					);
			}
		},
		{
			debounce: 300
		}
	);

	// The suggestions cover indicators of all organizations, so the
	// organization scope is applied to the loaded list.
	let options = $derived(
		(searchResource.current ?? []).filter((container) => {
			switch (scopeType) {
				case 'current':
					return (
						container.organization === page.data.currentOrganization.guid &&
						(includeSubordinateOrganizationalUnits || !container.organizational_unit)
					);
				case 'explicit':
					return (
						(checkedOrganizations.length === 0 && checkedOrganizationalUnits.length === 0) ||
						checkedOrganizations.includes(container.organization) ||
						checkedOrganizationalUnits.includes(container.organizational_unit ?? '')
					);
				default:
					return true;
			}
		})
	);

	let facets = $derived.by(() => {
		const facets = new Map([
			...buildCategoryFacetsWithCounts(categoryContext.options),
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['indicatorTypes', new Map(indicatorTypes.options.map((v) => [v as string, 0]))]
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

	{#snippet filterContent()}
		<OrganizationFilterDropDown
			allowAll
			bind:scope={scopeType}
			bind:includeSubordinateOrganizationalUnits
			bind:organizationValue={checkedOrganizations}
			bind:organizationalUnitValue={checkedOrganizationalUnits}
			mode="select"
			options={organizationOptions}
		/>
	{/snippet}
</SearchToolbar>

<div class="search-result">
	{#if searchResource.current}
		<SingleChoiceSelectableCardSet {onSelect} {options} {value} />
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
