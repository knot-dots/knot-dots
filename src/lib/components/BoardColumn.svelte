<script lang="ts">
	import { Icon, PlusSmall } from 'svelte-hero-icons';
	import type { IconSource } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';

	export let title: string;
	export let icon: IconSource | undefined = undefined;
	export let addItemUrl: string | undefined = undefined;
</script>

<section>
	<header>
		<h2>
			{title}
			{#if icon}
				<Icon src={icon} size="16" mini />
			{/if}
		</h2>
		{#if addItemUrl}
			<a href={addItemUrl} title={$_('add_item')}><Icon src={PlusSmall} size="20" /></a>
		{/if}
	</header>

	<slot />

	{#if addItemUrl}
		<footer>
			<a href={addItemUrl}>
				{$_('add_item')}
				<Icon src={PlusSmall} size="24" mini />
			</a>
		</footer>
	{/if}
</section>

<style>
	section {
		border-radius: 8px;
		display: flex;
		flex-basis: 20.75rem;
		flex-direction: column;
		flex-grow: 0;
		flex-shrink: 0;
		padding: 0.625rem;
	}

	section:nth-child(1) {
		background: var(--background, var(--gradient-first-column));
	}

	section:nth-child(2) {
		background: var(--background, var(--gradient-second-column));
	}

	section:nth-child(3) {
		background: var(--background, var(--gradient-third-column));
	}

	section:nth-child(4) {
		background: var(--background, var(--gradient-fourth-column));
	}

	section:nth-child(5) {
		background: var(--background, var(--gradient-fifth-column));
	}

	header {
		align-items: center;
		color: var(--color-gray-800);
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0.625rem 0;
	}

	header h2 {
		align-items: baseline;
		display: flex;
		font-size: inherit;
		font-weight: 700;
		gap: 0.5rem;
	}

	:global(header svg) {
		stroke-width: 2.5px;
	}

	footer {
		background-color: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		flex-shrink: 0;
		overflow: hidden;
	}

	footer:hover {
		border-color: var(--hover-border-color, var(--color-hover-neutral));
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
</style>
