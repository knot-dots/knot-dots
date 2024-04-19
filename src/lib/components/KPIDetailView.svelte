<script lang="ts">
	import { onMount } from 'svelte';
	import { _, date } from 'svelte-i18n';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import Pencil from '~icons/heroicons/pencil-solid';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isMeasureContainer,
		overlayKey,
		overlayURL,
		owners,
		payloadTypes,
		status
	} from '$lib/models';
	import type { AnyContainer, Container, IndicatorContainer, KPIContainer } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: KPIContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({
		...state,
		containerDetailView: { activeTab: 'basic-data', tabs: ['basic-data', 'effects'] }
	}));

	let selectedRevision: KPIContainer;

	$: {
		const parseResult = status.safeParse(paramsFromURL($page.url).get('status'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as KPIContainer[]).findLast(
					({ payload }) => payload.status == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	$: measure = relatedContainers.find(isMeasureContainer);

	let indicatorsRequest: Promise<IndicatorContainer[]> = new Promise(() => []);

	onMount(() => {
		if (container.payload.effect.length > 0) {
			indicatorsRequest = fetchContainers({
				organization: [container.organization],
				payloadType: [payloadTypes.enum.indicator]
			}) as Promise<IndicatorContainer[]>;
		}
	});
</script>

<article class="details">
	<h2 class="details-title">
		{selectedRevision.payload.title}
		{#if $ability.can('update', container)}
			<a class="button button-square quiet" href="#view={container.guid}&edit">
				<Pencil />
			</a>
		{/if}
	</h2>

	{#if $applicationState.containerDetailView.activeTab === 'basic-data'}
		<div class="details-tab" id="basic-data">
			{#if 'summary' in selectedRevision.payload}
				<div class="summary">
					<h3>{$_('summary')}</h3>
					{selectedRevision.payload.summary ?? ''}
				</div>
			{/if}

			{#if 'description' in container.payload}
				<div class="description">
					<h3>{$_('description')}</h3>
					<Viewer value={selectedRevision.payload.description} />
				</div>
			{/if}

			<div class="meta">
				<h3 class="meta-key">{$_('object')}</h3>
				<p class="meta-value">{$_(selectedRevision.payload.type)}</p>
			</div>

			{#if measure}
				<div class="meta">
					<h3 class="meta-key">{$_('measure')}</h3>
					<p class="meta-value">
						<a href={overlayURL($page.url, overlayKey.enum.view, measure.guid)}>
							{$_(measure.payload.title)}
						</a>
					</p>
				</div>
			{/if}

			<div class="meta">
				<h3 class="meta-key">{$_('status.label')}</h3>
				<p class="meta-value">
					<span class="badge badge--{statusColors.get(selectedRevision.payload.status)}">
						<svelte:component
							this={statusIcons.get(selectedRevision.payload.status) ?? LightBulb}
						/>
						{$_(selectedRevision.payload.status)}
					</span>
				</p>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('owned_by')}</h3>
				<ul class="meta-value">
					{#each owners( selectedRevision, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
						<li>{owner.payload.name}</li>
					{/each}
				</ul>
			</div>

			{#if 'audience' in selectedRevision.payload}
				<div class="meta">
					<h3 class="meta-key">{$_('audience')}</h3>
					<ul class="meta-value">
						{#each selectedRevision.payload.audience as audience}
							<li>{$_(audience)}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if 'fulfillmentDate' in selectedRevision.payload && selectedRevision.payload.fulfillmentDate}
				<div class="meta">
					<h3 class="meta-key">{$_('fulfillment_date')}</h3>
					<p class="meta-value">
						{$date(new Date(selectedRevision.payload.fulfillmentDate), { format: 'medium' })}
					</p>
				</div>
			{/if}

			<div class="meta">
				<h3 class="meta-key">{$_('created_date')}</h3>
				<ul class="meta-value">
					<li>{$date(revisions[0].valid_from, { format: 'medium' })}</li>
				</ul>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('modified_date')}</h3>
				<ul class="meta-value">
					<li>{$date(selectedRevision.valid_from, { format: 'medium' })}</li>
				</ul>
			</div>
		</div>
	{:else if $applicationState.containerDetailView.activeTab === 'effects'}
		<div class="details-tab" id="effects">
			<h3>{$_('effects')}</h3>

			{#await indicatorsRequest then indicators}
				{@const indicatorsByGuid = new Map(indicators.map((ic) => [ic.guid, ic]))}
				{#each selectedRevision.payload.effect as effect}
					{@const indicator = indicatorsByGuid.get(effect.indicator)}
					{#if indicator}
						<IndicatorChart
							container={indicator}
							relatedContainers={[selectedRevision]}
							showEffects
						>
							<a href={overlayURL($page.url, overlayKey.enum.view, indicator.guid)} slot="caption">
								{indicator.payload.title}
							</a>
						</IndicatorChart>
					{/if}
				{/each}
			{/await}
		</div>
	{/if}
</article>
