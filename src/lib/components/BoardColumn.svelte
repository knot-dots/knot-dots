<script lang="ts">
	import { _ } from 'svelte-i18n';
	import FilterIcon from '$lib/icons/FilterIcon.svelte';
	import type { ContainerType } from '$lib/models';

	export let title: string;
	export let containerType: ContainerType;
</script>

<section>
	<header>
		<h2>{title}</h2>
		<FilterIcon class="icon-20" />
	</header>
	<slot />
	<footer>
		<a href="/container/{containerType}" class="button primary">{$_('add_item')}</a>
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

	footer a {
		display: block;
		text-align: center;
	}
</style>
