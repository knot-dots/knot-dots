<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import Card from '$lib/components/Card.svelte';
	import { type IndicatorContainer, payloadTypes } from '$lib/models';
	import { ability } from '$lib/stores';

	export let containers: IndicatorContainer[];
</script>

<div class="indicators">
	{#if $ability.can('create', payloadTypes.enum.indicator)}
		<p>
			<a class="button primary" href="#create={payloadTypes.enum.indicator}">
				<PlusSmall />
				{$_('indicator')}
			</a>
		</p>
	{/if}
	<ul>
		{#each containers as container}
			<li>
				<Card --height="100%" {container} />
			</li>
		{/each}
	</ul>
</div>

<style>
	div {
		flex: 1 1;
		overflow-y: auto;
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
		min-width: calc(100vw - 3.5rem - 3rem);
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
