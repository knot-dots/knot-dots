<script lang="ts">
	import { setContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { page } from '$app/stores';
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
	import {
		type AnyContainer,
		type Container,
		type IndicatorContainer,
		isMeasureContainer,
		isPageContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		type MeasureContainer,
		type MeasureMonitoringContainer,
		overlayKey,
		paramsFromFragment,
		type TaskContainer,
		type User
	} from '$lib/models';
	import { overlayWidth } from '$lib/stores';

	export let indicators: IndicatorContainer[] | undefined = undefined;
	export let measures: MeasureContainer[] | undefined = undefined;
	export let measureElements: MeasureMonitoringContainer[] | undefined = undefined;
	export let isPartOfOptions: AnyContainer[];
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
	export let tasks: TaskContainer[] | undefined = undefined;
	export let users: User[] | undefined = undefined;

	setContext('overlay', true);

	let container: AnyContainer;

	$: {
		container = revisions[revisions.length - 1];
	}

	$: hashParams = paramsFromFragment($page.url);
	$: edit = hashParams.has(overlayKey.enum.create) || hashParams.has(overlayKey.enum.edit);

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
	<OverlayNavigation {container} />
	{#if isPageContainer(container) && hashParams.has(overlayKey.enum['edit-help'])}
		<EditHelpOverlay {container}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</EditHelpOverlay>
	{:else if isPageContainer(container) && hashParams.has(overlayKey.enum['view-help'])}
		<ViewHelpOverlay {container}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</ViewHelpOverlay>
	{:else if edit}
		<EditOverlay {container} {isPartOfOptions} {relatedContainers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</EditOverlay>
	{:else if hashParams.has(overlayKey.enum.members) && users}
		<MembersOverlay {container} {users}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</MembersOverlay>
	{:else if hashParams.has(overlayKey.enum.chapters) && isStrategyContainer(container) && relatedContainers}
		<ChaptersOverlay containers={relatedContainers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</ChaptersOverlay>
	{:else if hashParams.has(overlayKey.enum.relations) && relatedContainers}
		<RelationsOverlay containers={relatedContainers}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</RelationsOverlay>
	{:else if hashParams.has(overlayKey.enum['measures']) && isStrategyContainer(container) && measures}
		<MeasuresOverlay containers={measures}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</MeasuresOverlay>
	{:else if hashParams.has(overlayKey.enum['measure-monitoring']) && (isMeasureContainer(container) || isSimpleMeasureContainer(container)) && measureElements && indicators}
		<MeasureMonitoringOverlay {container} containers={measureElements}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</MeasureMonitoringOverlay>
	{:else if hashParams.has(overlayKey.enum.tasks) && tasks && relatedContainers}
		<TasksOverlay {container} containers={tasks}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</TasksOverlay>
	{:else if hashParams.has(overlayKey.enum.indicators) && indicators}
		<IndicatorsOverlay containers={indicators}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</IndicatorsOverlay>
	{:else if 'guid' in container}
		<ViewOverlay {container} {relatedContainers} {revisions}>
			<OverlayFullscreenToggle on:click={toggleFullscreen} enabled={fullScreen} />
		</ViewOverlay>
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
