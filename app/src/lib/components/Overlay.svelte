<script lang="ts">
	import { setContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import ChaptersOverlay from '$lib/components/ChaptersOverlay.svelte';
	import ContentPartnersOverlay from '$lib/components/ContentPartnersOverlay.svelte';
	import IndicatorCatalogOverlay from '$lib/components/IndicatorCatalogOverlay.svelte';
	import IndicatorsOverlay from '$lib/components/IndicatorsOverlay.svelte';
	import MeasureMonitoringOverlay from '$lib/components/MeasureMonitoringOverlay.svelte';
	import MeasuresOverlay from '$lib/components/MeasuresOverlay.svelte';
	import MembersOverlay from '$lib/components/MembersOverlay.svelte';
	import NewIndicatorCatalogOverlay from '$lib/components/NewIndicatorCatalogOverlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import TasksOverlay from '$lib/components/TasksOverlay.svelte';
	import TeasersOverlay from '$lib/components/TeasersOverlay.svelte';
	import ViewHelpOverlay from '$lib/components/ViewHelpOverlay.svelte';
	import ViewOverlay from '$lib/components/ViewOverlay.svelte';
	import { overlayKey } from '$lib/models';
	import { type OverlayData, overlayWidth } from '$lib/stores';

	interface Props {
		data: OverlayData;
	}

	let { data }: Props = $props();

	setContext('overlay', true);

	let fullScreen = $state({ enabled: false });

	setContext('overlayFullScreen', fullScreen);

	let offset = $state(0);

	function startExpand(event: MouseEvent) {
		event.preventDefault();
		offset = event.offsetX - 12;
		window.addEventListener('mousemove', expand);
	}

	function stopExpand() {
		window.removeEventListener('mousemove', expand);
	}

	function expand(event: MouseEvent) {
		$overlayWidth = (window.innerWidth - event.pageX + offset) / window.innerWidth;

		if ($overlayWidth * window.innerWidth < 320) {
			$overlayWidth = 320 / window.innerWidth;
		} else if ($overlayWidth * window.innerWidth > window.innerWidth - 400) {
			$overlayWidth = 1 - 400 / window.innerWidth;
		}
	}
</script>

<svelte:window onmouseup={stopExpand} />

<section
	class="overlay"
	class:overlay-fullscreen={fullScreen.enabled}
	transition:slide={{ axis: 'x' }}
	style="--width-factor: {$overlayWidth}"
>
	<!--svelte-ignore a11y_no_static_element_interactions -->
	<div class="resize-handle" onmousedown={startExpand}></div>
	{#if data.key === overlayKey.enum['view-help']}
		<ViewHelpOverlay container={data.container} />
	{:else if data.key === overlayKey.enum['members']}
		<MembersOverlay container={data.container} users={data.users} />
	{:else if data.key === overlayKey.enum['chapters']}
		<ChaptersOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['content-partners']}
		<ContentPartnersOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['teasers']}
		<TeasersOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['relations']}
		<RelationOverlay object={data.container} relatedContainers={data.relatedContainers} />
	{:else if data.key === overlayKey.enum['measures']}
		<MeasuresOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['measure-monitoring']}
		<MeasureMonitoringOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['tasks']}
		<TasksOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['indicator-catalog']}
		<IndicatorCatalogOverlay
			indicatorTemplates={data.indicatorTemplates}
			indicators={data.indicators}
		/>
	{:else if data.key === overlayKey.enum['new-indicator-catalog']}
		<NewIndicatorCatalogOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['indicators']}
		<IndicatorsOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['view']}
		{#key data.container.guid}
			<ViewOverlay container={data.container} revisions={data.revisions} />
		{/key}
	{/if}
</section>

<style>
	.overlay.overlay-fullscreen {
		left: 0;
		position: absolute;
		top: 0;
		width: 100vw;
	}

	@media (min-width: 768px) {
		.overlay {
			--width-factor: 0.65;

			width: calc(100vw * var(--width-factor));
		}

		.overlay > :global(*) {
			min-width: calc(100vw * var(--width-factor));
		}

		.overlay > :global(:is(aside, dialog)) {
			min-width: revert;
		}
	}

	.resize-handle {
		background-image: url(/src/lib/assets/resize-handle.svg);
		background-position: 2px center;
		background-repeat: no-repeat;
		background-clip: border-box;
		border-right: solid 2px transparent;
		cursor: ew-resize;
		height: 100%;
		left: -0.75rem;
		min-width: 0;
		position: absolute;
		width: 0.75rem;
		z-index: 1;
	}

	.resize-handle:active,
	.resize-handle:hover {
		border-color: var(--focus-color);
	}
</style>
