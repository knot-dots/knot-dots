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
		paramsFromFragment,
		payloadTypes
	} from '$lib/models';
	import { addEffectState } from '$lib/stores';

	export let value: IndicatorTemplateContainer;

	let indicatorTemplatesRequest: Promise<IndicatorTemplateContainer[]>;
	let indicatorsRequest: Promise<IndicatorContainer[]>;
	let params: URLSearchParams;

	$: {
		params = paramsFromFragment($page.url);
		indicatorTemplatesRequest = fetchContainers({
			category: params.getAll('category'),
			indicatorCategory: params.getAll('indicatorCategory'),
			indicatorType: params.getAll('indicatorType'),
			measureType: params.getAll('measureType'),
			payloadType: [payloadTypes.enum.indicator_template],
			topic: params.getAll('topic')
		}) as Promise<IndicatorTemplateContainer[]>;
		indicatorsRequest = fetchContainers({
			organization: [$page.data.currentOrganization.guid],
			payloadType: [payloadTypes.enum.indicator]
		}) as Promise<IndicatorContainer[]>;
	}

	function select(template: IndicatorTemplateContainer, indicators: IndicatorContainer[]) {
		const indicator = indicators.find(({ payload }) => payload.quantity == template.guid);
		if (indicator) {
			if ($addEffectState.target) {
				$addEffectState.effect = indicator.guid;
				goto(`#view=${$addEffectState.target}&edit`);
			}
		} else {
			value = template;
		}
	}
</script>

{#await Promise.all([indicatorTemplatesRequest, indicatorsRequest]) then [templates, indicators]}
	<ul>
		{#each templates as template}
			<li>
				<IndicatorTemplateCard --height="100%" container={template}>
					<button
						class="button-square"
						title={$_('indicator_template.select')}
						type="button"
						on:click|stopPropagation={() => select(template, indicators)}
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
