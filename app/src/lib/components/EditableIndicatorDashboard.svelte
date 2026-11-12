<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import requestSubmit from '$lib/client/requestSubmit';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import IndicatorDashboardCard from '$lib/components/IndicatorDashboardCard.svelte';
	import IndicatorDashboardCardMenu from '$lib/components/IndicatorDashboardCardMenu.svelte';
	import IndicatorPicker from '$lib/components/IndicatorPicker.svelte';
	import { columnsFor, layout, rowHeightFor } from '$lib/indicatorDashboardLayout';
	import {
		type AnyPayload,
		type Container,
		type IndicatorDashboardItem,
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
	// space in the grid. Each item knows its index in the payload, where changes go.
	let items = $derived(
		container.payload.item.flatMap((item, index) => {
			const loaded = itemsResource.current?.find(
				({ indicator }) => indicator.guid === item.indicator
			);
			return loaded ? [{ ...loaded, index, item }] : [];
		})
	);

	let grid = $state<HTMLElement>();

	let emptyCatalogButton = $state<HTMLButtonElement>();

	// Read out by screen readers whenever a card changes
	let announcement = $state('');

	// Changes go into the payload; the form of the section saves them, like it saves the title, so
	// that the two never save the same revision at once.
	function save(item: IndicatorDashboardItem[], event: Event) {
		container.payload.item = item;
		requestSubmit(event);
	}

	function describe(title: string, { height, view, width }: IndicatorDashboardItem) {
		return $_('indicator_dashboard.announce.settings', {
			values: {
				height: $_(`indicator_dashboard.height.${height}`),
				title,
				view: $_(`indicator_dashboard.view.${view}`),
				width: $_(`indicator_dashboard.width_name.${width}`)
			}
		});
	}

	function change(
		index: number,
		title: string,
		patch: Partial<IndicatorDashboardItem>,
		event: Event
	) {
		const changed = { ...container.payload.item[index], ...patch };
		save(container.payload.item.with(index, changed), event);
		announcement = describe(title, changed);
	}

	// Swaps the card with the one before or after it among the cards shown.
	async function move(position: number, title: string, offset: -1 | 1, event: Event) {
		const neighbor = items[position + offset];
		if (!neighbor) {
			return;
		}
		const index = items[position].index;
		const item = [...container.payload.item];
		[item[index], item[neighbor.index]] = [item[neighbor.index], item[index]];
		// Moving the card in the DOM takes the focus away from it.
		const focused = document.activeElement;
		save(item, event);
		announcement = $_(
			offset < 0
				? 'indicator_dashboard.announce.moved_forward'
				: 'indicator_dashboard.announce.moved_back',
			{ values: { count: items.length, position: position + offset + 1, title } }
		);
		await tick();
		if (focused instanceof HTMLElement && focused.isConnected) {
			focused.focus();
		}
	}

	async function remove(position: number, title: string, event: Event) {
		save(container.payload.item.toSpliced(items[position].index, 1), event);
		announcement = $_('indicator_dashboard.announce.removed', { values: { title } });
		await tick();
		// The focus goes to the card that takes the place of the removed one, or to the section when
		// no card is left.
		const next = grid?.children[Math.min(position, items.length - 1)];
		(
			next?.querySelector('a') ??
			emptyCatalogButton ??
			document.getElementById(idForTitle)
		)?.focus();
	}

	function moveWithKeyboard(position: number, title: string) {
		return (event: KeyboardEvent) => {
			if (!mayUpdate || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
				return;
			}
			const offset =
				event.key === 'ArrowLeft' || event.key === 'ArrowUp'
					? -1
					: event.key === 'ArrowRight' || event.key === 'ArrowDown'
						? 1
						: undefined;
			if (offset) {
				// Alt + ArrowLeft would otherwise go back in the history.
				event.preventDefault();
				void move(position, title, offset, event);
			}
		};
	}

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
		bind:this={grid}
		class={['indicators', 'wide', gridWidth === 0 && 'is-measuring']}
		style:--columns={columns}
		style:--row-height="{rowHeightFor(gridWidth, columns)}px"
	>
		{#each items as { index, indicator, item, related }, i (indicator.guid)}
			{@const { column, columnSpan, row, rowSpan } = placements[i]}
			{@const title = indicator.payload.title}
			{#snippet settings()}
				<IndicatorDashboardCardMenu
					count={items.length}
					{item}
					onchange={(patch, event) => change(index, title, patch, event)}
					onmove={(offset, event) => move(i, title, offset, event)}
					onremove={(event) => remove(i, title, event)}
					position={i}
				/>
			{/snippet}
			<!-- Alt and the arrow keys move the focused card; the menu offers the same. -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<li
				onkeydown={moveWithKeyboard(i, title)}
				style:grid-column="{column} / span {columnSpan}"
				style:grid-row="{row} / span {rowSpan}"
			>
				<IndicatorDashboardCard
					container={indicator}
					height={item.height}
					relatedContainers={related}
					settings={mayUpdate ? settings : undefined}
					view={item.view}
				/>
			</li>
		{/each}
	</ul>
{:else if mayUpdate && container.payload.item.length === 0}
	<p>{$_('indicator_dashboard.empty')}</p>
	<div class="catalog">
		<button bind:this={emptyCatalogButton} onclick={() => dialog?.showModal()} type="button">
			<ChartMixed />
			{$_('custom_collection.add_items')}
		</button>
	</div>
{/if}

{#if mayUpdate}
	<p aria-live="polite" class="is-visually-hidden">{announcement}</p>

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
