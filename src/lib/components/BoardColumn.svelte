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
		display: flex;
		flex-basis: 320px;
		flex-direction: column;
		flex-grow: 0;
		flex-shrink: 0;
		gap: 16px;
	}

	footer,
	footer button {
		width: 100%;
	}

	header {
		background: white;
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		color: var(--color-gray-800);
		display: flex;
		height: 59px;
		justify-content: space-between;
		margin-bottom: 24px;
		padding: 16px;
	}

	header h2 {
		font-size: inherit;
		font-weight: 600;
	}
</style>
