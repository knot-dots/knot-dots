<script lang="ts">
	import { Icon, Plus } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import OrganizationOverlay from '$lib/components/OrganizationOverlay.svelte';
	import { payloadTypes } from '$lib/models';
	import { ability } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div>
	{#if $ability.can('create', payloadTypes.enum.organization)}
		<p>
			<a class="button primary" href="/organization/new">
				<Icon src={Plus} size="20" mini />
				{$_('organization')}
			</a>
		</p>
	{/if}
	<ul>
		{#each data.containers as container}
			<li>
				<OrganizationCard {container} />
			</li>
		{/each}
	</ul>
</div>

{#if data.overlayData}
	<OrganizationOverlay {...data.overlayData} />
{/if}

<style>
	div {
		flex: 1 1;
		margin: 1.5rem;
		overflow: auto;
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

	.button {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
	}
</style>
