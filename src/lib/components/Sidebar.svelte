<script lang="ts">
	import ChevronLeftIcon from '$lib/ChevronLeftIcon.svelte';
	import ChevronRightIcon from '$lib/ChevronRightIcon.svelte';
	import FilterIcon from '$lib/FilterIcon.svelte';
	import MapIcon from '$lib/MapIcon.svelte';
	import QuestionMarkCircleIcon from '$lib/QuestionMarkCircleIcon.svelte';
	import SortDescendingIcon from '$lib/SortDescendingIcon.svelte';
	import TableIcon from '$lib/TableIcon.svelte';
	import UserGroupIcon from '$lib/UserGroupIcon.svelte';
	import ViewBoardsIcon from '$lib/ViewBoardsIcon.svelte';
	import { navigationToggle } from '$lib/stores.js';

	let isExpanded = true;
	function toggleSidebar() {
		isExpanded = !isExpanded;
	}
</script>

<aside class:is-expanded={isExpanded} class:is-visible={$navigationToggle}>
	<ul class="group group-controls">
		<li class:is-hidden={!isExpanded}>
			<button title="View boards">
				<ViewBoardsIcon class="icon-24" />
			</button>
		</li>
		<li class:is-hidden={!isExpanded}>
			<button title="Map">
				<MapIcon class="icon-24" />
			</button>
		</li>
		<li class:is-hidden={!isExpanded}>
			<button title="Table">
				<TableIcon class="icon-24" />
			</button>
		</li>
		<li>
			{#if isExpanded}
				<button class="primary" on:click={toggleSidebar} title="Collapse sidebar">
					<ChevronLeftIcon class="icon-24" />
				</button>
			{:else}
				<button class="primary" on:click={toggleSidebar} title="Expand sidebar">
					<ChevronRightIcon class="icon-24" />
				</button>
			{/if}
		</li>
	</ul>

	<ul class="group group-actions">
		<li>
			<button>
				<FilterIcon class="icon-20" />
				<span class:is-hidden={!isExpanded}>Filter</span>
			</button>
		</li>
		<li>
			<button>
				<SortDescendingIcon class="icon-20" />
				<span class:is-hidden={!isExpanded}>Sort</span>
			</button>
		</li>
	</ul>

	<ul class="group group-links">
		<li>
			<a href="/help">
				<QuestionMarkCircleIcon class="icon-20" />
				<span class:is-hidden={!isExpanded}>Help</span>
			</a>
		</li>
		<li>
			<a href="/about">
				<UserGroupIcon class="icon-20" />
				<span class:is-hidden={!isExpanded}>About us</span>
			</a>
		</li>
	</ul>
</aside>

<style>
	aside {
		border-right: solid 1px var(--color-gray-200);
		display: none;
		flex-direction: column;
		flex-shrink: 0;
		gap: 1rem;
		width: 4.75rem;
	}

	@media (min-width: 768px) {
		aside {
			display: flex;
		}
	}

	aside.is-visible {
		display: flex;
	}

	aside.is-expanded {
		width: 18rem;
	}

	aside > ul {
		padding: 1rem 0.75rem 0;
	}

	aside > ul:nth-child(n + 2) {
		border-top: solid 1px var(--color-gray-200);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group.group-controls {
		flex-direction: row;
	}

	.group.group-controls li:last-child {
		margin-left: auto;
	}

	.group.group-controls button {
		--padding-x: 12px;
		--padding-y: 12px;
	}

	.group.group-links {
		border-bottom: solid 1px var(--color-gray-200);
		color: var(--color-gray-500);
		padding-bottom: 1rem;
	}

	.group-actions button,
	.group-links a {
		align-items: center;
		display: flex;
		padding: 14px 14px;
		text-align: left;
	}

	aside.is-expanded .group-actions button,
	aside.is-expanded .group-links a {
		gap: 0.5rem;
		padding: 12px 20px;
		width: 100%;
	}
</style>
