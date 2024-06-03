<script lang="ts">
	import fetchContainers from '$lib/client/fetchContainers';
	import Card from '$lib/components/Card.svelte';
	import { type ContainerWithEffect, type IndicatorContainer, payloadTypes } from '$lib/models';

	export let container: ContainerWithEffect;

	$: indicatorsRequest = fetchContainers({
		organization: [container.organization],
		payloadType: [payloadTypes.enum.indicator]
	}) as Promise<IndicatorContainer[]>;
</script>

{#await indicatorsRequest then indicators}
	{@const indicatorsByGuid = new Map(indicators.map((ic) => [ic.guid, ic]))}
	{#if indicators.length > 0}
		{#if container.payload.effect.length > 0}
			<ul class="carousel">
				{#each container.payload.effect as effect}
					{@const indicator = indicatorsByGuid.get(effect.indicator)}
					{#if indicator}
						<li>
							<Card --height="100%" container={indicator} relatedContainers={[container]} />
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	{/if}
{/await}
