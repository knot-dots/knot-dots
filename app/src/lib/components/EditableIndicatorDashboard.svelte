<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import IndicatorDashboardCard from '$lib/components/IndicatorDashboardCard.svelte';
	import IndicatorPicker from '$lib/components/IndicatorPicker.svelte';
	import { columnsFor, layout, rowHeightFor } from '$lib/indicatorDashboardLayout';
	import {
		type AnyPayload,
		type Container,
		type IndicatorDashboardPayload,
		indicatorDashboardItemFor,
		isActualDataContainer,
		isEffectContainer,
		isIndicatorContainer,
		isObjectiveContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<IndicatorDashboardPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const idForTitle = crypto.randomUUID();

	let dialog = $state<HTMLDialogElement>();

	let mayUpdate = $derived(editable && $ability.can('update', container));

	let header = $state<HTMLElement>();

	const inViewport = new IsInViewport(() => header);

	let inViewportOnce = $state(false);

	$effect(() => {
		if (inViewport.current) {
			inViewportOnce = true;
		}
	});

	let selectedIndicators = $derived(container.payload.item.map(({ indicator }) => indicator));

	// A string compares by value, so replacing the container with an equal copy, as dragging the
	// section does, fetches nothing again. Neither does changing how an indicator shows.
	let itemKey = $derived(selectedIndicators.join());

	// Every indicator shows the actual data, objectives and effects of the organization or
	// organizational unit the section belongs to, like its detail view does. The dashboard yields
	// all of them with its indicators in one request.
	const itemsResource = resource(
		[() => container.guid, () => itemKey, () => inViewportOnce],
		async ([guid, itemKey, inViewportOnce], _, { signal }) => {
			if (!inViewportOnce) {
				return undefined;
			}

			if (itemKey === '') {
				return [];
			}

			const containers = await fetchRelatedContainers(
				guid,
				{
					organization: [container.organization],
					organizationalUnit: container.organizational_unit ? [container.organizational_unit] : []
				},
				'alpha',
				{ signal }
			);
			const related = containers.filter((c) => !isIndicatorContainer(c));

			return containers
				.filter(isIndicatorContainer)
				.map((indicator) => ({ indicator, related: relatedTo(indicator.guid, related) }));
		},
		{ lazy: true }
	);

	// Keeps what belongs to the given indicator: its actual data, its objectives and effects, and
	// everything else, such as the goals and measures these are part of.
	function relatedTo(guid: string, containers: Container[]) {
		return containers.filter((c) => {
			if (isActualDataContainer(c)) {
				return c.payload.indicator === guid;
			}
			if (isEffectContainer(c) || isObjectiveContainer(c)) {
				return c.relation.some(
					({ object, predicate }) =>
						object === guid &&
						(predicate === predicates.enum['is-measured-by'] ||
							predicate === predicates.enum['is-objective-for'])
				);
			}
			return true;
		});
	}

	// Preserve the order of the selection. Indicators that are gone are left out, so they leave no
	// space in the grid.
	let items = $derived(
		container.payload.item.flatMap((item) => {
			const loaded = itemsResource.current?.find(
				({ indicator }) => indicator.guid === item.indicator
			);
			return loaded ? [{ ...loaded, item }] : [];
		})
	);

	let gridWidth = $state(0);

	let columns = $derived(columnsFor(gridWidth));

	let placements = $derived(
		layout(
			items.map(({ item }) => item),
			columns
		)
	);

	async function confirm(selected: string[]) {
		// Indicators that stay keep their settings.
		const item = selected.map(
			(guid) =>
				container.payload.item.find(({ indicator }) => indicator === guid) ??
				indicatorDashboardItemFor(guid)
		);

		try {
			const response = await saveContainer({
				...container,
				payload: { ...container.payload, item }
			});
			if (response.ok) {
				const updatedContainer = await response.json();
				container.payload = updatedContainer.payload;
				container.revision = updatedContainer.revision;
				dialog?.close();
			} else {
				const error = await response.json();
				alert(error.message);
			}
		} catch (error) {
			console.error(error);
			alert($_('indicator_dashboard.save_failed'));
		}
	}
</script>

<header bind:this={header}>
	<svelte:element this={heading} class="details-heading">
		{#if mayUpdate}
			<label class="is-visually-hidden" for={idForTitle}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				id={idForTitle}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('chapter.title.placeholder')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if mayUpdate && container.payload.item.length > 0}
				<li>
					<button
						class="action-button action-button--size-l"
						onclick={() => dialog?.showModal()}
						type="button"
						{@attach tooltip($_('custom_collection.add_items'))}
					>
						<Plus />
						<span class="is-visually-hidden">{$_('custom_collection.add_items')}</span>
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if itemsResource.error}
	<p>{$_('indicator_dashboard.load_failed')}</p>
{:else if items.length > 0}
	<ul
		bind:clientWidth={gridWidth}
		class={['indicators', 'wide', gridWidth === 0 && 'is-measuring']}
		style:--columns={columns}
		style:--row-height="{rowHeightFor(gridWidth, columns)}px"
	>
		{#each items as { indicator, item, related }, i (indicator.guid)}
			{@const { column, columnSpan, row, rowSpan } = placements[i]}
			<li style:grid-column="{column} / span {columnSpan}" style:grid-row="{row} / span {rowSpan}">
				<IndicatorDashboardCard
					container={indicator}
					height={item.height}
					relatedContainers={related}
					view={item.view}
				/>
			</li>
		{/each}
	</ul>
{:else if mayUpdate && container.payload.item.length === 0}
	<p>{$_('indicator_dashboard.empty')}</p>
	<div class="catalog">
		<button onclick={() => dialog?.showModal()} type="button">
			<ChartMixed />
			{$_('custom_collection.add_items')}
		</button>
	</div>
{/if}

{#if mayUpdate}
	<IndicatorPicker
		bind:dialog
		onconfirm={confirm}
		payloadType={[payloadTypes.enum.indicator]}
		title={$_('custom_collection.dialog.title')}
		value={selectedIndicators}
	/>
{/if}

<style>
	/* The layout places every card; the DOM keeps the order of the items for screen readers. */
	.indicators {
		display: grid;
		gap: 1rem;
		grid-auto-rows: var(--row-height);
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
	}

	/* The cards are placed once the width of the grid is known, so they do not jump. */
	.is-measuring {
		visibility: hidden;
	}
</style>
