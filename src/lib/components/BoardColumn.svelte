<script lang="ts">
	import { Icon, PlusSmall } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import type { ContainerType, Level } from '$lib/models';
	import { user } from '$lib/stores';

	export let title: string;
	export let addItemUrl: string;
</script>

<section>
	<header>
		<h2>{title}</h2>
		{#if $user.isAuthenticated}
			<a href={addItemUrl} title={$_('add_item')}><Icon src={PlusSmall} size="20" /></a>
		{/if}
	</header>
	<div class="vertical-scroll-wrapper">
		<slot />
		<footer>
			{#if $user.isAuthenticated}
				<a href={addItemUrl} class="button primary">
					{$_('add_item')}
					<Icon src={PlusSmall} size="24" mini />
				</a>
			{:else}
				<a>{$_('add_item')} <Icon src={PlusSmall} size="24" mini /></a>
			{/if}
		</footer>
	</div>
</section>

<style>
	section {
		background-color: var(--color-indigo-050);
		border-radius: 8px;
		display: flex;
		flex-basis: 20.75rem;
		flex-direction: column;
		flex-grow: 0;
		flex-shrink: 0;
		padding: 0.625rem;
	}

	header {
		align-items: center;
		color: var(--color-gray-800);
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.625rem;
	}

	header h2 {
		font-size: inherit;
		font-weight: 700;
	}

	:global(header svg) {
		stroke-width: 2.5px;
	}

	footer {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		flex-shrink: 0;
		overflow: hidden;
	}

	footer a {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		padding: 10px 20px;
		text-align: center;
		width: 100%;
	}

	.vertical-scroll-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-y: scroll;
		padding-bottom: 6px;
	}
</style>
