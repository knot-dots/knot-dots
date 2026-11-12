<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import requestSubmit from '$lib/client/requestSubmit';
	import requestSubmitElement from '$lib/client/requestSubmitElement';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import IndicatorDashboardCard from '$lib/components/IndicatorDashboardCard.svelte';
	import IndicatorDashboardCardMenu from '$lib/components/IndicatorDashboardCardMenu.svelte';
	import IndicatorDashboardResize, {
		type Rect,
		type Resizing
	} from '$lib/components/IndicatorDashboardResize.svelte';
	import IndicatorPicker from '$lib/components/IndicatorPicker.svelte';
	import {
		columnsFor,
		dropIntoGap,
		type Gap,
		gapsOf,
		gridGap,
		layout,
		type Placement,
		rowHeightFor,
		rowSpanOf,
		widthSteps
	} from '$lib/indicatorDashboardLayout';
	import {
		type AnyPayload,
		type Container,
		type IndicatorDashboardItem,
		type IndicatorDashboardPayload,
		indicatorDashboardHeights,
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
	function save(item: IndicatorDashboardItem[], source: Event | HTMLElement) {
		container.payload.item = item;
		if (source instanceof Event) {
			requestSubmit(source);
		} else {
			requestSubmitElement(source);
		}
	}

	// Names a width as the menu does, whatever the number of columns shown
	function widthText(width: IndicatorDashboardItem['width']) {
		return $_(`indicator_dashboard.width_name.${width}`);
	}

	function describe(title: string, { height, view, width }: IndicatorDashboardItem) {
		return $_('indicator_dashboard.announce.settings', {
			values: {
				height: $_(`indicator_dashboard.height.${height}`),
				title,
				view: $_(`indicator_dashboard.view.${view}`),
				width: widthText(width)
			}
		});
	}

	// Writes the cards shown, in a new order or with new settings, into their places in the
	// payload; indicators that are not shown keep theirs.
	function saveShown(shown: IndicatorDashboardItem[], event: Event) {
		const item = [...container.payload.item];
		items.forEach(({ index }, k) => {
			item[index] = shown[k];
		});
		save(item, event);
	}

	async function focusCard(position: number) {
		await tick();
		(grid?.children[position] as HTMLElement | undefined)?.focus();
	}

	function change(
		index: number,
		title: string,
		patch: Partial<IndicatorDashboardItem>,
		source: Event | HTMLElement
	) {
		const changed = { ...container.payload.item[index], ...patch };
		save(container.payload.item.with(index, changed), source);
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

	// While a card is dragged: where it is, and the gaps of the grid when the dragging started, with
	// the card still in its place. The cards do not move until it is dropped.
	let dragged = $state<{ gaps: Gap[]; position: number }>();

	// Where the dragged card would go: before or after a card, or into a gap
	let dropTarget = $state<{ after: boolean; position: number } | { gap: number }>();

	let dragFrame: number | undefined;

	function startDragging(position: number) {
		return (event: DragEvent) => {
			if (!mayUpdate || (event.target as Element).closest('.dropdown, .handle')) {
				event.preventDefault();
				return;
			}
			// The sections around are sortable with svelte-dnd-action, which cancels any native
			// dragging that reaches them.
			event.stopPropagation();
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move';
				event.dataTransfer.setData('text/plain', items[position].indicator.guid);
			}
			const gaps = gapsOf(
				items.map(({ item }) => item),
				columns
			);
			// After the browser has taken the image of the card it drags
			dragFrame = requestAnimationFrame(() => {
				dragged = { gaps, position };
			});
		};
	}

	function stopDragging() {
		if (dragFrame !== undefined) {
			cancelAnimationFrame(dragFrame);
			dragFrame = undefined;
		}
		dragged = undefined;
		dropTarget = undefined;
	}

	function dragOverCard(position: number) {
		return (event: DragEvent) => {
			if (!dragged) {
				return;
			}
			event.preventDefault();
			const { left, width } = (event.currentTarget as HTMLElement).getBoundingClientRect();
			dropTarget =
				position === dragged.position
					? undefined
					: { after: event.clientX > left + width / 2, position };
		};
	}

	function dropOnCard(event: DragEvent) {
		if (!dragged || !dropTarget || !('position' in dropTarget)) {
			return;
		}
		event.preventDefault();
		const from = dragged.position;
		let to = dropTarget.position + (dropTarget.after ? 1 : 0);
		if (from < to) {
			to--;
		}
		stopDragging();
		if (to === from) {
			return;
		}
		const shown = items.map(({ item }) => item);
		const [card] = shown.splice(from, 1);
		shown.splice(to, 0, card);
		const title = items[from].indicator.payload.title;
		saveShown(shown, event);
		announcement = $_(
			to < from
				? 'indicator_dashboard.announce.moved_forward'
				: 'indicator_dashboard.announce.moved_back',
			{ values: { count: items.length, position: to + 1, title } }
		);
		void focusCard(to);
	}

	function dropIntoGapAt(gap: Gap, event: DragEvent) {
		if (!dragged) {
			return;
		}
		event.preventDefault();
		const from = dragged.position;
		const title = items[from].indicator.payload.title;
		stopDragging();
		const shown = dropIntoGap(
			items.map(({ item }) => item),
			from,
			gap,
			columns
		);
		const to = gap.anchor === from ? from : gap.anchor > from ? gap.anchor : gap.anchor + 1;
		saveShown(shown, event);
		announcement = $_('indicator_dashboard.announce.filled_gap', {
			values: {
				height: $_(`indicator_dashboard.height.${shown[to].height}`),
				title,
				width: widthText(shown[to].width)
			}
		});
		void focusCard(to);
	}

	let gridWidth = $state(0);

	let columns = $derived(columnsFor(gridWidth));

	let rowHeight = $derived(rowHeightFor(gridWidth, columns));

	let columnWidth = $derived((gridWidth - (columns - 1) * gridGap) / columns);

	const extent = (count: number, unit: number) => count * unit + (count - 1) * gridGap;

	// Where a placement is in the grid, in pixels
	function rectOf({ column, columnSpan, row, rowSpan }: Placement): Rect {
		return {
			height: extent(rowSpan, rowHeight),
			left: (column - 1) * (columnWidth + gridGap),
			top: (row - 1) * (rowHeight + gridGap),
			width: extent(columnSpan, columnWidth)
		};
	}

	// While a card is resized with a handle: its card, and the height and width it snaps to.
	// Nothing changes until the handle is released.
	let resizing = $state<Resizing & { position: number }>();

	let stopResizing: (() => void) | undefined;

	$effect(() => () => stopResizing?.());

	function startResizing(position: number, axis: Resizing['axis']) {
		return (event: PointerEvent) => {
			if (!mayUpdate || event.button !== 0) {
				return;
			}
			// No dragging of the card, no selecting of text
			event.preventDefault();
			event.stopPropagation();

			const { item, index } = items[position];
			const placement = placements[position];
			const rect = rectOf(placement);
			const start = { x: event.clientX, y: event.clientY };
			// Where the right and the bottom edge snap to
			const widthStops =
				axis === 'height'
					? []
					: widthSteps(item, placement, columns).map(({ columnSpan, width }) => ({
							width,
							x: columnSpan >= columns ? gridWidth : rect.left + extent(columnSpan, columnWidth)
						}));
			const heightStops =
				axis === 'width'
					? []
					: indicatorDashboardHeights.options.map((height) => ({
							height,
							y: rect.top + extent(rowSpanOf(height), rowHeight)
						}));
			resizing = {
				atMax: { height: false, width: false },
				axis,
				height: item.height,
				pointer: start,
				position,
				width: item.width
			};

			const nearest = <T,>(stops: T[], at: (stop: T) => number, to: number) =>
				stops.reduce((best, stop) =>
					Math.abs(at(stop) - to) < Math.abs(at(best) - to) ? stop : best
				);

			const move = (event: PointerEvent) => {
				if (!resizing) {
					return;
				}
				const right = rect.left + rect.width + event.clientX - start.x;
				const bottom = rect.top + rect.height + event.clientY - start.y;
				const maxRight = Math.max(...widthStops.map(({ x }) => x));
				const maxBottom = Math.max(...heightStops.map(({ y }) => y));
				const atMax = {
					height: heightStops.length > 0 && bottom > maxBottom + 6,
					width: widthStops.length > 0 && right > maxRight + 6
				};
				if ((atMax.width && !resizing.atMax.width) || (atMax.height && !resizing.atMax.height)) {
					announcement =
						atMax.width && atMax.height
							? $_('indicator_dashboard.max_size')
							: atMax.width
								? $_('indicator_dashboard.max_width')
								: $_('indicator_dashboard.max_height');
				}
				resizing = {
					...resizing,
					atMax,
					height:
						heightStops.length > 0
							? nearest(heightStops, ({ y }) => y, Math.min(bottom, maxBottom)).height
							: item.height,
					pointer: { x: event.clientX, y: event.clientY },
					width:
						widthStops.length > 0
							? nearest(widthStops, ({ x }) => x, Math.min(right, maxRight)).width
							: item.width
				};
			};

			const finish = (commit: boolean) => {
				const done = resizing;
				stopResizing?.();
				if (!done || !grid) {
					return;
				}
				const patch: Partial<IndicatorDashboardItem> = {
					...(done.height !== item.height ? { height: done.height } : {}),
					...(done.width !== item.width ? { width: done.width } : {})
				};
				if (commit && Object.keys(patch).length > 0) {
					change(index, items[position].indicator.payload.title, patch, grid);
				} else {
					announcement = $_('indicator_dashboard.announce.size_unchanged');
				}
				void focusCard(position);
			};

			const release = () => finish(true);
			const cancel = () => finish(false);
			// Esc cancels before anything else reacts to it, such as the menu button that kept the focus
			const escape = (event: KeyboardEvent) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					finish(false);
				}
			};
			window.addEventListener('pointermove', move);
			window.addEventListener('pointerup', release);
			window.addEventListener('pointercancel', cancel);
			window.addEventListener('keydown', escape, true);
			stopResizing = () => {
				window.removeEventListener('pointermove', move);
				window.removeEventListener('pointerup', release);
				window.removeEventListener('pointercancel', cancel);
				window.removeEventListener('keydown', escape, true);
				stopResizing = undefined;
				resizing = undefined;
			};
		};
	}

	// On two columns every card takes the whole row, so only its height can be dragged.
	let resizeAxes = $derived<Resizing['axis'][]>(
		columns > 2 ? ['width', 'height', 'both'] : ['height']
	);

	let preview = $derived(
		resizing &&
			rectOf(
				layout(
					items.map(({ item }, k) =>
						k === resizing?.position
							? { ...item, height: resizing.height, width: resizing.width }
							: item
					),
					columns
				)[resizing.position]
			)
	);

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
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class={['board', 'wide', resizing && 'is-resizing']}
		ondragleave={(event) => {
			if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
				dropTarget = undefined;
			}
		}}
		style:--columns={columns}
		style:--row-height="{rowHeight}px"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<ul
			bind:clientWidth={gridWidth}
			bind:this={grid}
			class={['indicators', gridWidth === 0 && 'is-measuring']}
			ondragover={(event) => {
				// Between two cards, the insertion line keeps the place it shows.
				if (dropTarget && 'position' in dropTarget) {
					event.preventDefault();
				}
			}}
			ondrop={dropOnCard}
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
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
				<li
					aria-label={mayUpdate
						? $_('indicator_dashboard.card_label', {
								values: { count: items.length, position: i + 1, title }
							})
						: undefined}
					class:is-dragged={dragged?.position === i}
					draggable={mayUpdate}
					ondragend={stopDragging}
					ondragover={dragOverCard(i)}
					ondragstart={startDragging(i)}
					onkeydown={moveWithKeyboard(i, title)}
					style:grid-column="{column} / span {columnSpan}"
					style:grid-row="{row} / span {rowSpan}"
					tabindex={mayUpdate ? 0 : undefined}
				>
					<IndicatorDashboardCard
						container={indicator}
						height={item.height}
						relatedContainers={related}
						settings={mayUpdate ? settings : undefined}
						view={item.view}
					/>
					{#if mayUpdate}
						{#each resizeAxes as axis (axis)}
							<button
								aria-label={$_(`indicator_dashboard.resize_${axis}`)}
								class={['handle', `handle--${axis}`, 'system-layout']}
								onpointerdown={startResizing(i, axis)}
								tabindex="-1"
								title={$_(`indicator_dashboard.resize_${axis}`)}
								type="button"
							></button>
						{/each}
					{/if}
				</li>
			{/each}
		</ul>

		{#if dragged}
			<!-- The gaps and the insertion line lie over the grid while a card is dragged. -->
			<div aria-hidden="true" class="drag-layer system-layout">
				{#each dragged.gaps as gap, k (k)}
					<div
						class={['gap', dropTarget && 'gap' in dropTarget && dropTarget.gap === k && 'is-over']}
						ondragover={(event) => {
							event.preventDefault();
							dropTarget = { gap: k };
						}}
						ondrop={(event) => dropIntoGapAt(gap, event)}
						role="presentation"
						style:grid-column="{gap.column} / span {gap.columnSpan}"
						style:grid-row="{gap.row} / span {gap.rowSpan}"
					>
						{$_('indicator_dashboard.drop_here')}
					</div>
				{/each}
				{#if dropTarget && 'position' in dropTarget}
					{@const { column, columnSpan, row, rowSpan } = placements[dropTarget.position]}
					<div
						class={['insertion', dropTarget.after ? 'insertion--after' : 'insertion--before']}
						style:grid-column="{column} / span {columnSpan}"
						style:grid-row="{row} / span {rowSpan}"
					></div>
				{/if}
			</div>
		{/if}

		{#if resizing && preview}
			<IndicatorDashboardResize {columns} {preview} {resizing} {widthText} />
		{/if}
	</div>
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
	/* The board keeps the stacking of its cards, handles and layers to itself. It lies above the
	   sections that follow while a card menu is open or a card is resized. */
	.board {
		isolation: isolate;
		position: relative;
	}

	.board:has(:global([aria-expanded='true'])),
	.board.is-resizing {
		z-index: 1;
	}

	/* The layout places every card; the DOM keeps the order of the items for screen readers. */
	.indicators,
	.drag-layer {
		display: grid;
		gap: 1rem;
		grid-auto-rows: var(--row-height);
		grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
	}

	.indicators {
		position: relative;
		z-index: 1;
	}

	/* Each card keeps its handles with it, and a card with its menu open lies above the others and
	   their handles. */
	.indicators > li {
		position: relative;
		z-index: 0;
	}

	.indicators > li:has(:global([aria-expanded='true'])) {
		z-index: 1;
	}

	/* While a card is resized, the cards lose their surface and the glow of the target check, so
	   the grid shows behind them. */
	.board.is-resizing .indicators :global(.card) {
		background: transparent;
		box-shadow: none;
	}

	.board.is-resizing,
	.board.is-resizing :global(*) {
		user-select: none;
	}

	/* Handles at the right edge, the bottom edge and the corner, half over the card */
	.handle {
		background-color: var(--color-surface-default);
		border: 1px solid var(--color-border-accent-strong);
		box-shadow: var(--shadow-sm);
		display: none;
		padding: 0;
		position: absolute;
		touch-action: none;
		z-index: 2;
	}

	/* A larger area to grab */
	.handle::before {
		content: '';
		inset: -8px;
		position: absolute;
	}

	.handle--width {
		border-radius: 5px;
		cursor: ew-resize;
		height: 36px;
		margin-top: -18px;
		right: -5px;
		top: 50%;
		width: 10px;
	}

	.handle--height {
		border-radius: 5px;
		bottom: -5px;
		cursor: ns-resize;
		height: 10px;
		left: 50%;
		margin-left: -18px;
		width: 36px;
	}

	.handle--both {
		border-radius: 50%;
		bottom: -5px;
		cursor: nwse-resize;
		height: 14px;
		right: -5px;
		width: 14px;
	}

	/* No handles on touch screens, where the menu sets the size, nor while the menu is open */
	@media (hover: hover) and (pointer: fine) {
		.board:not(.is-resizing)
			.indicators
			> li:not(.is-dragged, :has(:global([aria-expanded='true']))):is(:hover, :focus-within)
			> .handle {
			display: block;
		}
	}

	.indicators > li {
		border-radius: var(--card-border-radius);
	}

	.indicators > li[draggable='true'] {
		cursor: grab;
	}

	.indicators > li:focus-visible {
		outline: 2px solid var(--focus-color);
		outline-offset: 2px;
	}

	/* The dragged card stays in its place until it is dropped. */
	.indicators > li.is-dragged {
		opacity: 0.5;
	}

	/* Only the gaps take the dragged card; the cards below stay targets for the insertion line. */
	.drag-layer {
		inset: 0;
		pointer-events: none;
		position: absolute;
		z-index: 2;
	}

	.gap {
		align-items: center;
		background-color: var(--color-background-accent-subtle);
		border: 2px dashed var(--color-border-accent-strong);
		border-radius: var(--card-border-radius);
		color: var(--color-text-accent-default);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		justify-content: center;
		pointer-events: auto;
	}

	.gap.is-over {
		background-color: var(--color-background-accent-default);
	}

	/* A bar in the middle of the gap between two cards */
	.insertion {
		position: relative;
	}

	.insertion::before {
		background-color: var(--color-background-accent-strong);
		border-radius: 2px;
		bottom: 0;
		content: '';
		position: absolute;
		top: 0;
		width: 4px;
	}

	.insertion--before::before {
		left: calc(-0.5rem - 2px);
	}

	.insertion--after::before {
		right: calc(-0.5rem - 2px);
	}

	/* The cards are placed once the width of the grid is known, so they do not jump. */
	.is-measuring {
		visibility: hidden;
	}
</style>
