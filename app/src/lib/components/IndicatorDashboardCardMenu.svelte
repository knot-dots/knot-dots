<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowLeft from '~icons/flowbite/arrow-left-outline';
	import ArrowRight from '~icons/flowbite/arrow-right-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import CascadingMenu from '$lib/components/CascadingMenu.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import { heightIcons, widthIcons } from '$lib/indicatorDashboardIcons';
	import {
		type IndicatorDashboardItem,
		indicatorDashboardHeights,
		indicatorDashboardViews,
		indicatorDashboardWidths
	} from '$lib/models';

	interface Props {
		count: number;
		item: IndicatorDashboardItem;
		onchange: (patch: Partial<IndicatorDashboardItem>, event: Event) => void;
		onmove: (offset: -1 | 1, event: Event) => void;
		onremove: (event: Event) => void;
		// Of the card among the cards, starting at 0
		position: number;
	}

	let { count, item, onchange, onmove, onremove, position }: Props = $props();
</script>

<CascadingMenu strategy="fixed" title={$_('container_settings_dropdown.title')}>
	<ViewToggle
		label={$_('indicator_dashboard.view')}
		name="{item.indicator}-view"
		onchange={(view, event) => onchange({ view }, event)}
		options={indicatorDashboardViews.options.map((value) => ({
			label: $_(`indicator_dashboard.view.${value}`),
			value
		}))}
		value={item.view}
	/>
	<ViewToggle
		label={$_('indicator_dashboard.height')}
		name="{item.indicator}-height"
		onchange={(height, event) => onchange({ height }, event)}
		options={indicatorDashboardHeights.options.map((value) => ({
			icon: heightIcons[value],
			label: $_(`indicator_dashboard.height.${value}`),
			value
		}))}
		value={item.height}
	/>
	<ViewToggle
		label={$_('indicator_dashboard.width')}
		name="{item.indicator}-width"
		onchange={(width, event) => onchange({ width }, event)}
		options={indicatorDashboardWidths.options.map((value) => ({
			icon: widthIcons[value],
			label: $_(`indicator_dashboard.width.${value}`),
			value
		}))}
		value={item.width}
	/>

	<div class="cascading-menu-divider" role="presentation"></div>

	<button
		aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowUp"
		class="cascading-menu-item"
		disabled={position === 0}
		onclick={(event) => onmove(-1, event)}
		type="button"
	>
		<ArrowLeft />
		<strong>{$_('indicator_dashboard.move_forward')}</strong>
		<kbd>{$_('indicator_dashboard.move_forward.shortcut')}</kbd>
	</button>
	<button
		aria-keyshortcuts="Alt+ArrowRight Alt+ArrowDown"
		class="cascading-menu-item"
		disabled={position === count - 1}
		onclick={(event) => onmove(1, event)}
		type="button"
	>
		<ArrowRight />
		<strong>{$_('indicator_dashboard.move_back')}</strong>
		<kbd>{$_('indicator_dashboard.move_back.shortcut')}</kbd>
	</button>

	<div class="cascading-menu-divider" role="presentation"></div>

	<!-- The card goes away with its menu. -->
	<button class="cascading-menu-item" onclick={onremove} type="button">
		<TrashBin />
		<strong>{$_('remove')}</strong>
	</button>
</CascadingMenu>
