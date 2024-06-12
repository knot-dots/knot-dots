<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import IndicatorTemplateCard from '$lib/components/IndicatorTemplateCard.svelte';
	import {
		type IndicatorContainer,
		type IndicatorTemplateContainer,
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		paramsFromFragment,
		payloadTypes
	} from '$lib/models';
	import { addEffectState } from '$lib/stores';
	import Card from '$lib/components/Card.svelte';

	export let value: IndicatorContainer | IndicatorTemplateContainer;

	let indicatorsAndTemplatesRequest: Promise<
		Array<IndicatorContainer | IndicatorTemplateContainer>
	>;
	let params: URLSearchParams;

	$: {
		params = paramsFromFragment($page.url);
		indicatorsAndTemplatesRequest = fetchContainers({
			category: params.getAll('category'),
			indicatorCategory: params.getAll('indicatorCategory'),
			indicatorType: params.getAll('indicatorType'),
			measureType: params.getAll('measureType'),
			payloadType: [payloadTypes.enum.indicator, payloadTypes.enum.indicator_template],
			topic: params.getAll('topic')
		}) as Promise<IndicatorTemplateContainer[]>;
	}

	function select(container: IndicatorContainer | IndicatorTemplateContainer) {
		if (isIndicatorContainer(container)) {
			if ($addEffectState.target) {
				$addEffectState.effect = container.guid;
				goto(`#view=${$addEffectState.target}&edit`);
			} else {
				goto(`#view=${container.guid}&edit`);
			}
		} else {
			value = container;
		}
	}

	function alreadyInUse(
		indicatorTemplate: IndicatorTemplateContainer,
		indicators: IndicatorContainer[]
	) {
		return indicators.findIndex((ic) => ic.payload.quantity == indicatorTemplate.guid) > -1;
	}
</script>

{#await indicatorsAndTemplatesRequest then containers}
	{@const indicators = containers.filter(isIndicatorContainer)}
	<ul>
		{#each containers
			.filter(isIndicatorContainer)
			.filter(() => params.has('alreadyInUse')) as indicator}
			<li>
				<Card --height="100%" container={indicator}>
					<button
						class="button-square"
						title={$_('indicator_template.select')}
						type="button"
						on:click|stopPropagation={() => select(indicator)}
						slot="button"
					>
						<PlusSmall />
					</button>
				</Card>
			</li>
		{/each}
		{#each containers
			.filter(isIndicatorTemplateContainer)
			.filter((c) => !alreadyInUse(c, indicators)) as template}
			<li>
				<IndicatorTemplateCard --height="100%" container={template}>
					<button
						class="button-square"
						title={$_('indicator_template.select')}
						type="button"
						on:click|stopPropagation={() => select(template)}
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
