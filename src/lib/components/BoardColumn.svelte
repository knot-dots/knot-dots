<script lang="ts">
	import { Icon, Plus } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import type { ContainerType } from '$lib/models';
	import { user } from '$lib/stores';

	export let title: string;
	export let containerType: ContainerType;
</script>

<section>
	<header>
		<h2>{title}</h2>
		{#if $user.isAuthenticated}
			<a href="/{containerType}/new" title={$_('add_item')}><Icon src={Plus} size="20" /></a>
		{/if}
	</header>
	<div class="vertical-scroll-wrapper">
		<slot />
		<footer>
			{#if $user.isAuthenticated}
				<a href="/{containerType}/new" class="button primary">{$_('add_item')}</a>
			{:else}
				<button class="primary" disabled>{$_('add_item')}</button>
			{/if}
		</footer>
	</div>
</section>

<style>
	section {
		display: flex;
		flex-basis: 320px;
		flex-direction: column;
		flex-grow: 0;
		flex-shrink: 0;
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
		align-items: center;
	}

	header h2 {
		font-size: inherit;
		font-weight: 600;
	}

	:global(header svg) {
		stroke-width: 2.5px;
	}

	footer > * {
		display: block;
		text-align: center;
		width: 100%;
	}

	.vertical-scroll-wrapper {
		display: flex;
		flex-direction: column;
		gap: 16px;
		overflow-y: scroll;
	}
</style>
