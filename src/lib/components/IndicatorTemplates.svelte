<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import IndicatorTemplateCard from '$lib/components/IndicatorTemplateCard.svelte';
	import { type IndicatorTemplateContainer, paramsFromFragment, payloadTypes } from '$lib/models';

	export let value: IndicatorTemplateContainer;

	let indicatorTemplatesRequest: Promise<IndicatorTemplateContainer[]>;
	let params: URLSearchParams;

	$: {
		params = paramsFromFragment($page.url);
		indicatorTemplatesRequest = fetchContainers({
			category: params.getAll('category'),
			measureType: params.getAll('measureType'),
			payloadType: [payloadTypes.enum.indicator_template],
			topic: params.getAll('topic')
		}) as Promise<IndicatorTemplateContainer[]>;
	}
</script>

{#await indicatorTemplatesRequest then containers}
	<ul>
		{#each containers as container}
			<li>
				<IndicatorTemplateCard --height="100%" {container}>
					<button
						class="button-square"
						title={$_('indicator_template.select')}
						type="button"
						on:click|stopPropagation={() => (value = container)}
						slot="button"
					>
						<PlusSmall />
					</button>
				</IndicatorTemplateCard>
			</li>
		{/each}
	</ul>
{/await}

<style>
	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	li {
		width: 19.5rem;
	}
</style>
