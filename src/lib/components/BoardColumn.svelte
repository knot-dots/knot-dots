<script lang="ts">
	import FilterIcon from '$lib/icons/FilterIcon.svelte';
	import { _ } from 'svelte-i18n';
	export let title: string;
</script>

<section>
	<header>
		<h2>{title}</h2>
		<FilterIcon class="icon-20" />
	</header>
	<slot />
	<footer>
		<button class="primary" disabled>{$_('add_item')}</button>
	</footer>
</section>

<style>
	section {
		flex-basis: 320px;
		flex-grow: 0;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	footer,
	footer button {
		width: 100%;
	}

	header {
		margin-bottom: 24px;
		height: 59px;
		background: white;
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		padding: 16px;
		color: var(--color-gray-800);
		display: flex;
		justify-content: space-between;
	}

	header h2 {
		font-size: inherit;
		font-weight: 600;
	}
</style>
