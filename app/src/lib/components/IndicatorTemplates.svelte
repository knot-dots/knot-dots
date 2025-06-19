<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import createEffect from '$lib/client/createEffect';
	import createObjective from '$lib/client/createObjective';
	import fetchContainers from '$lib/client/fetchContainers';
	import Card from '$lib/components/Card.svelte';
	import IndicatorTemplateCard from '$lib/components/IndicatorTemplateCard.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type IndicatorContainer,
		type IndicatorTemplateContainer,
		isIndicatorContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes
	} from '$lib/models';
	import { addEffectState, addObjectiveState } from '$lib/stores';

	export let value: IndicatorContainer | IndicatorTemplateContainer;

	let indicatorTemplatesRequest: Promise<Array<IndicatorTemplateContainer>>;
	let indicatorsRequest: Promise<Array<IndicatorContainer>>;
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
			category: params.getAll('category'),
			indicatorCategory: params.getAll('indicatorCategory'),
			indicatorType: params.getAll('indicatorType'),
			measureType: params.getAll('measureType'),
			organization: [$page.data.currentOrganization.guid],
			payloadType: [payloadTypes.enum.indicator],
			topic: params.getAll('topic')
		}) as Promise<IndicatorContainer[]>;
	}

	async function select(container: IndicatorContainer | IndicatorTemplateContainer) {
		if (isIndicatorContainer(container)) {
			if ($addEffectState.target) {
				const effect = await createEffect($addEffectState.target, container);
				const params = new URLSearchParams([
					[overlayKey.enum.view, effect.guid],
					...(createFeatureDecisions($page.data.features).useEditableDetailView()
						? []
						: [[overlayKey.enum.edit, '']])
				]);
				$addEffectState = {};
				await goto(`#${params.toString()}`);
			} else if ($addObjectiveState.target) {
				const objective = await createObjective($addObjectiveState.target, container);
				const params = new URLSearchParams([
					[overlayKey.enum.view, objective.guid],
					...(createFeatureDecisions($page.data.features).useEditableDetailView()
						? []
						: [[overlayKey.enum.edit, '']])
				]);
				$addObjectiveState = {};
				await goto(`#${params.toString()}`);
			} else {
				const params = new URLSearchParams([
					[overlayKey.enum.view, container.guid],
					...(createFeatureDecisions($page.data.features).useEditableDetailView()
						? []
						: [[overlayKey.enum.edit, '']])
				]);
				await goto(`#${params.toString()}`);
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

{#await Promise.all( [indicatorTemplatesRequest, indicatorsRequest] ) then [indicatortTemplates, indicators]}
	<ul>
		{#each indicators.filter(() => params.has('alreadyInUse')) as indicator}
			<li>
				<Card --height="100%" container={indicator}>
					{#snippet button()}
						<button
							class="button-square"
							title={$_('indicator_template.select')}
							type="button"
							on:click|stopPropagation={() => select(indicator)}
						>
							<PlusSmall />
						</button>
					{/snippet}
				</Card>
			</li>
		{/each}
		{#each indicatortTemplates.filter((c) => !alreadyInUse(c, indicators)) as template}
			<li>
				<IndicatorTemplateCard --height="100%" container={template}>
					{#snippet button()}
						<button
							class="button-square"
							title={$_('indicator_template.select')}
							type="button"
							on:click|stopPropagation={() => select(template)}
						>
							<PlusSmall />
						</button>
					{/snippet}
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
