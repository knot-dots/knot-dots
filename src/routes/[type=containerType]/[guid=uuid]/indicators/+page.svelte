<script lang="ts">
	import { Icon, Plus } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { payloadTypes } from '$lib/models';
	import { ability, overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="indicators">
	{#if $ability.can('create', payloadTypes.enum.indicator)}
		<p>
			<a class="button primary" href="#create={payloadTypes.enum.indicator}">
				<Icon src={Plus} size="20" mini />
				{$_('indicator')}
			</a>
		</p>
	{/if}
	<ul>
		{#each data.containers as container}
			<li>
				<Card --height="100%" {container} />
			</li>
		{/each}
	</ul>
</div>

{#if browser && $overlay.revisions.length > 0}
	<Overlay {...$overlay} />
{/if}

<style>
	div {
		flex: 1 1;
		overflow-x: auto;
		padding: 1.5rem;
	}

	p {
		margin-bottom: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
		min-width: calc(100vw - (18rem + 1px + 3rem));
	}

	li {
		width: 19.5rem;
	}

	.button {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
	}
</style>
