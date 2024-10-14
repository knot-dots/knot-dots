<script lang="ts">
	import { setContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import ChaptersOverlay from '$lib/components/ChaptersOverlay.svelte';
	import EditHelpOverlay from '$lib/components/EditHelpOverlay.svelte';
	import EditOverlay from '$lib/components/EditOverlay.svelte';
	import IndicatorsOverlay from '$lib/components/IndicatorsOverlay.svelte';
	import MeasureMonitoringOverlay from '$lib/components/MeasureMonitoringOverlay.svelte';
	import MeasuresOverlay from '$lib/components/MeasuresOverlay.svelte';
	import MembersOverlay from '$lib/components/MembersOverlay.svelte';
	import OverlayFullscreenToggle from '$lib/components/OverlayFullscreenToggle.svelte';
	import OverlayNavigation from '$lib/components/OverlayNavigation.svelte';
	import RelationsOverlay from '$lib/components/RelationsOverlay.svelte';
	import TasksOverlay from '$lib/components/TasksOverlay.svelte';
	import ViewHelpOverlay from '$lib/components/ViewHelpOverlay.svelte';
	import ViewOverlay from '$lib/components/ViewOverlay.svelte';
	import { overlayKey } from '$lib/models';
	import { type OverlayData, overlayWidth } from '$lib/stores';
	import ProfileOverlay from '$lib/components/ProfileOverlay.svelte';

	export let data: OverlayData;

	setContext('overlay', true);

	let fullScreen = false;

	function toggleFullscreen() {
		fullScreen = !fullScreen;
	}

	let offset = 0;

	function startExpand(event: MouseEvent) {
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

<svelte:window on:mouseup={stopExpand} />

<section
	class="overlay"
	class:overlay-fullscreen={fullScreen}
	transition:slide={{ axis: 'x' }}
	style="--width-factor: {$overlayWidth}"
>
	<!--svelte-ignore a11y-no-static-element-interactions -->
	<div class="resize-handle" on:mousedown|preventDefault={startExpand} />
	<OverlayNavigation container={'container' in data ? data.container : undefined} />
	{#if data.key === overlayKey.enum['edit-help']}
		<EditHelpOverlay container={data.container}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</EditHelpOverlay>
	{:else if data.key === overlayKey.enum['view-help']}
		<ViewHelpOverlay container={data.container}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</ViewHelpOverlay>
	{:else if data.key === overlayKey.enum['create'] || data.key === overlayKey.enum['edit']}
		<EditOverlay
			container={data.container}
			isPartOfOptions={data.isPartOfOptions}
			relatedContainers={data.relatedContainers}
		>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</EditOverlay>
	{:else if data.key === overlayKey.enum['members']}
		<MembersOverlay container={data.container} users={data.users}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</MembersOverlay>
	{:else if data.key === overlayKey.enum['chapters']}
		<ChaptersOverlay containers={data.containers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</ChaptersOverlay>
	{:else if data.key === overlayKey.enum['relations']}
		<RelationsOverlay containers={data.containers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</RelationsOverlay>
	{:else if data.key === overlayKey.enum['measures']}
		<MeasuresOverlay containers={data.containers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</MeasuresOverlay>
	{:else if data.key === overlayKey.enum['measure-monitoring']}
		<MeasureMonitoringOverlay container={data.container} containers={data.containers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</MeasureMonitoringOverlay>
	{:else if data.key === overlayKey.enum['tasks']}
		<TasksOverlay container={data.container} containers={data.containers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</TasksOverlay>
	{:else if data.key === overlayKey.enum['indicators']}
		<IndicatorsOverlay containers={data.containers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</IndicatorsOverlay>
	{:else if data.key === overlayKey.enum['view']}
		<ViewOverlay
			container={data.container}
			relatedContainers={data.relatedContainers}
			revisions={data.revisions}
		>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</ViewOverlay>
	{:else if data.key === overlayKey.enum['profile']}
		<ProfileOverlay containers={data.containers} />
	{/if}
</section>

<style>
	.overlay.overlay-fullscreen {
		margin-left: -3.875rem;
		width: 100vw;
	}

	.overlay > :global(aside) {
		font-size: 0.875rem;
		height: calc(100vh - var(--nav-height));
		min-width: 0;
		padding: 1.5rem 0.5rem 0.5rem;
		position: absolute;
		top: var(--nav-height);
		width: 3.5rem;
	}

	.overlay > :global(aside ~ *) {
		margin-left: 3.5rem;
	}

	@media (min-width: 768px) {
		.overlay {
			--width-factor: 0.65;

			width: calc(100% * var(--width-factor));
		}

		.overlay > :global(*) {
			min-width: calc(100vw * var(--width-factor) - 3.5rem);
		}

		.overlay > :global(nav) {
			min-width: calc(100vw * var(--width-factor));
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
