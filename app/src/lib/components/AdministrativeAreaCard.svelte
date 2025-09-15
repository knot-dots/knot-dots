<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/Card.svelte';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import transformFileURL from '$lib/transformFileURL.js';

	interface Props {
		container: OrganizationalUnitContainer;
	}

	let { container }: Props = $props();
</script>

<Card
	--height="100%"
	{container}
	href={() => resolve('/[[guid=uuid]]/all/page', { guid: container.guid })}
>
	{#snippet body()}
		{#if container.payload.image}
			<img
				alt={$_('coat_of_arms')}
				class="coat-of-arms"
				loading="lazy"
				src={transformFileURL(container.payload.image)}
			/>
		{/if}
	{/snippet}
</Card>

<style>
	.coat-of-arms {
		margin: auto auto 0;
		max-height: 10rem;
	}
</style>
