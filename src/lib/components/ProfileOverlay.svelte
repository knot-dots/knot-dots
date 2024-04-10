<script lang="ts">
	import { slide } from 'svelte/transition';
	import { _ } from 'svelte-i18n';
	import Maximize from '~icons/knotdots/maximize';
	import Minimize from '~icons/knotdots/minimize';
	import { page } from '$app/stores';
	import OverlayNavigation from '$lib/components/OverlayNavigation.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		type Container,
		isAssignedTo,
		isTaskContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer,
		overlayKey,
		paramsFromFragment
	} from '$lib/models';
	import { overlayWidth, user } from '$lib/stores';

	export let organizations: OrganizationContainer[];
	export let organizationalUnits: OrganizationalUnitContainer[];
	export let relatedContainers: Container[];

	$: tasks = relatedContainers.filter(isTaskContainer).filter(isAssignedTo($user));

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

	<OverlayNavigation />

	<aside>
		<Sidebar helpSlug="profile">
			<svelte:fragment slot="extra">
				<li>
					<button
						class="button-nav button-square"
						on:click={toggleFullscreen}
						title={$_('full_screen')}
					>
						{#if fullScreen}<Minimize />{:else}<Maximize />{/if}
					</button>
				</li>
			</svelte:fragment>
		</Sidebar>
	</aside>

	<div class="content-details masked-overflow">
		{#if paramsFromFragment($page.url).has(overlayKey.enum['my-tasks']) && tasks}
			<Tasks containers={tasks} />
		{:else}
			<ProfileView containers={relatedContainers} {organizations} {organizationalUnits} />
		{/if}
	</div>
</section>

<style>
	.overlay.overlay-fullscreen {
		margin-left: -3.875rem;
		width: 100vw;
	}

	.overlay > aside {
		font-size: 0.875rem;
		height: calc(100vh - var(--nav-height));
		min-width: 0;
		padding: 1.5rem 0.5rem 0.5rem;
		position: absolute;
		top: var(--nav-height);
		width: 3.5rem;
	}

	.overlay > aside ~ :global(*) {
		margin-left: 3.5rem;
	}

	@media (min-width: 768px) {
		.overlay {
			--width-factor: 0.65;

			width: calc(100% * var(--width-factor));
		}

		.overlay > * {
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
