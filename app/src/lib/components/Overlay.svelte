<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import createDelayedFlag from '$lib/client/createDelayedFlag.svelte';
	import { LoadingTracker, setLoadingTrackerContext } from '$lib/contexts/loadingTracker.svelte';
	import ChaptersOverlay from '$lib/components/ChaptersOverlay.svelte';
	import EditableDetailView from '$lib/components/EditableDetailView.svelte';
	import IndicatorsOverlay from '$lib/components/IndicatorsOverlay.svelte';
	import IOOIOverlay from '$lib/components/IOOIOverlay.svelte';
	import MeasureMonitoringOverlay from '$lib/components/MeasureMonitoringOverlay.svelte';
	import MeasuresOverlay from '$lib/components/MeasuresOverlay.svelte';
	import MembersOverlay from '$lib/components/MembersOverlay.svelte';
	import OverlayCloseButton from '$lib/components/OverlayCloseButton.svelte';
	import OverlayLayout from '$lib/components/OverlayLayout.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import ResourcesOverlay from '$lib/components/ResourcesOverlay.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import TasksOverlay from '$lib/components/TasksOverlay.svelte';
	import TemplatesOverlay from '$lib/components/TemplatesOverlay.svelte';
	import { isGoalContainer, isMeasureContainer, isProgramContainer, overlayKey } from '$lib/models';
	import { type OverlayData, overlayLoading, overlaySwitching, overlayWidth } from '$lib/stores';
	import { isTemplateScope } from '$lib/templateScopes';

	interface Props {
		// Undefined while the data for an overlay that is opened for the first time is loading
		data?: OverlayData;
	}

	let { data }: Props = $props();

	setContext('overlay', true);

	// Sections within the overlay report to the progress bar of the overlay
	const loadingTracker = new LoadingTracker();

	setLoadingTrackerContext(loadingTracker);

	// The previous object is replaced by a skeleton unless the next one loads quickly
	const switching = createDelayedFlag(() => $overlaySwitching);

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

{#snippet layout(header: Snippet, main: Snippet)}
	<OverlayLayout {header} {main} />
{/snippet}

<svelte:window onmouseup={stopExpand} />

<section class="overlay" class:overlay-fullscreen={fullScreen.enabled}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="resize-handle" onmousedown={startExpand} role="separator"></div>
	<ProgressBar active={$overlayLoading || loadingTracker.active} position="overlay" />
	{#if !data || switching.current}
		<header class="overlay-skeleton-header">
			<OverlayCloseButton />
			<div class="overlay-skeleton-title"><Skeleton count={1} /></div>
			<div class="overlay-skeleton-actions">
				<div class="overlay-skeleton-workspaces"><Skeleton variant="block" /></div>
				<div class="overlay-skeleton-toggle"><Skeleton variant="block" /></div>
				<div class="overlay-skeleton-menu"><Skeleton variant="block" /></div>
			</div>
		</header>
		<!-- Uses the layout of detail views so that the skeleton lines up with the sections -->
		<article class="details">
			<div class="details-scroll-wrapper">
				<div class="details-section">
					<Skeleton count={4} />
				</div>
				<div class="details-section">
					<Skeleton count={3} variant="card" />
				</div>
			</div>
		</article>
	{:else if data.key === overlayKey.enum['members']}
		<MembersOverlay
			container={data.container}
			grants={data.grants}
			inheritedGrants={data.inheritedGrants}
			inheritedUsers={data.inheritedUsers}
			scope={data.scope}
			users={data.users}
		/>
	{:else if data.key === overlayKey.enum['chapters'] && isProgramContainer(data.container)}
		<ChaptersOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['goal-iooi'] && isGoalContainer(data.container)}
		<IOOIOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['measure-iooi'] && isMeasureContainer(data.container)}
		<IOOIOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['relations']}
		<RelationOverlay object={data.container} relatedContainers={data.relatedContainers} />
	{:else if data.key === overlayKey.enum['measures']}
		<MeasuresOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['measure-monitoring']}
		<MeasureMonitoringOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['tasks']}
		<TasksOverlay container={data.container} containers={data.containers} />
	{:else if data.key === overlayKey.enum['indicators']}
		<IndicatorsOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum['resources']}
		<ResourcesOverlay containers={data.containers} />
	{:else if data.key === overlayKey.enum.templates && isTemplateScope(data.container)}
		<TemplatesOverlay
			container={data.container}
			containers={data.containers}
			facets={data.facets}
		/>
	{:else if data.key === overlayKey.enum['view']}
		<EditableDetailView
			container={data.container}
			{layout}
			revisions={data.revisions}
			sections={data.sections}
		/>
	{/if}
</section>

<style>
	.overlay {
		background-color: white;
		border-radius: 24px 0 0 24px;
		box-shadow: 0px 12px 50px -12px rgba(0, 0, 0, 0.25);
		container: overlay / inline-size;
		display: flex;
		flex-direction: column;
		height: 100%;
		position: relative;
		width: 100%;
		z-index: 3;
	}

	.overlay.overlay-fullscreen {
		left: 0;
		position: absolute;
		top: 0;
		width: 100vw;
	}

	@media (min-width: 768px) {
		.overlay {
			flex: 0 0 calc(100vw * var(--overlay-width-factor));
		}
	}

	.overlay-skeleton-header {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		height: var(--header-height);
		padding: 0.375rem 0.75rem;
	}

	.overlay-skeleton-title {
		max-width: 16rem;
		width: 50%;
	}

	/* Sizes follow the workspace menus, edit mode toggle and settings menu of the header */
	.overlay-skeleton-actions {
		align-items: center;
		display: flex;
		gap: 0.75rem;
		margin-left: auto;
	}

	.overlay-skeleton-workspaces {
		height: 2rem;
		width: 6.5rem;
	}

	.overlay-skeleton-toggle {
		--skeleton-block-border-radius: 9999px;

		height: 2.25rem;
		width: 5.25rem;
	}

	.overlay-skeleton-menu {
		--skeleton-block-border-radius: 50%;

		height: 1.5rem;
		width: 1.5rem;
	}

	@container overlay (max-width: 30rem) {
		.overlay-skeleton-workspaces {
			display: none;
		}
	}

	.resize-handle {
		background-image: url(/src/lib/assets/resize-handle.svg);
		background-position: 0 center;
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
