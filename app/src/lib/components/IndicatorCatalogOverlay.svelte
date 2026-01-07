<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { goto } from '$app/navigation';
	import createEffect from '$lib/client/createEffect';
	import createObjective from '$lib/client/createObjective';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IndicatorTemplateCard from '$lib/components/IndicatorTemplateCard.svelte';
	import {
		audience,
		computeFacetCount,
		containerOfType,
		type EmptyIndicatorContainer,
		indicatorCategories,
		type IndicatorContainer,
		type IndicatorTemplateContainer,
		indicatorTypes,
		isIndicatorContainer,
		measureTypes,
		type NewContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		policyFieldBNK,
		quantities,
		sustainableDevelopmentGoals,
		topics,
		units
	} from '$lib/models';
	import { addEffectState, addObjectiveState, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		indicatorTemplates: IndicatorTemplateContainer[];
		indicators: IndicatorContainer[];
	}

	let { indicatorTemplates, indicators }: Props = $props();

	let params = $derived(paramsFromFragment(page.url));

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createCustomIndicator() {
		const container = containerOfType(
			payloadTypes.enum.indicator,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer & EmptyIndicatorContainer;

		container.payload.quantity = quantities.enum['quantity.custom'];
		container.payload.title = '';
		container.payload.unit = units.enum['unit.cubic_meter'];
		container.payload.indicatorCategory = [indicatorCategories.enum['indicator_category.custom']];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}

	function createIndicatorFromTemplate(template: IndicatorTemplateContainer) {
		const container = containerOfType(
			payloadTypes.enum.indicator,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer & EmptyIndicatorContainer;

		container.payload = {
			...template.payload,
			historicalValues: container.payload.historicalValues,
			quantity: template.guid,
			type: container.payload.type
		};

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}

	async function select(container: IndicatorContainer | IndicatorTemplateContainer) {
		if (isIndicatorContainer(container)) {
			if ($addEffectState.target) {
				const effect = await createEffect($addEffectState.target, container);
				const params = new URLSearchParams([[overlayKey.enum.view, effect.guid]]);
				$addEffectState = {};
				await goto(`#${params.toString()}`);
			} else if ($addObjectiveState.target) {
				const objective = await createObjective($addObjectiveState.target, container);
				const params = new URLSearchParams([[overlayKey.enum.view, objective.guid]]);
				$addObjectiveState = {};
				await goto(`#${params.toString()}`);
			} else {
				const params = new URLSearchParams([[overlayKey.enum.view, container.guid]]);
				await goto(`#${params.toString()}`);
			}
		} else {
			createIndicatorFromTemplate(container);
		}
	}

	function alreadyInUse(
		indicatorTemplate: IndicatorTemplateContainer,
		indicators: IndicatorContainer[]
	) {
		return indicators.findIndex((ic) => ic.payload.quantity == indicatorTemplate.guid) > -1;
	}

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}

	let facets = $derived(
		computeFacetCount(
			new Map([
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
				['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
				['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))]
			]),
			[
				...indicatorTemplates.filter((c) => !alreadyInUse(c, indicators)),
				...(params.has('alreadyInUse') ? indicators : [])
			]
		)
	);
</script>

<Header {facets} workspaceOptions={[]} />

<div class="content-details">
	<div class="details">
		<p class="details-section">
			<button class="template-category" type="button" onclick={() => createCustomIndicator()}>
				<Plus />
				{$_('indicator_form.create_custom')}
			</button>
		</p>

		<ul class="details-section">
			{#if params.has('alreadyInUse')}
				{#each indicators as indicator}
					<li>
						<Card --height="100%" container={indicator}>
							{#snippet button()}
								<button
									class="button-square"
									{@attach tooltip($_('indicator_template.select'))}
									type="button"
									onclick={stopPropagation(() => select(indicator))}
								>
									<Plus />
								</button>
							{/snippet}
						</Card>
					</li>
				{/each}
			{/if}
			{#each indicatorTemplates.filter((c) => !alreadyInUse(c, indicators)) as template}
				<li>
					<IndicatorTemplateCard --height="100%" container={template}>
						{#snippet button()}
							<button
								class="button-square"
								{@attach tooltip($_('indicator_template.select'))}
								type="button"
								onclick={stopPropagation(() => select(template))}
							>
								<Plus />
							</button>
						{/snippet}
					</IndicatorTemplateCard>
				</li>
			{/each}
		</ul>
	</div>
</div>

<Help slug={'indicator-catalog'} />

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
