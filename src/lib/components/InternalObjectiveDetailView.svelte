<script lang="ts">
	import { onMount } from 'svelte';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import TaskCarousel from '$lib/components/TaskCarousel.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { isContainerWithObjective, isMeasureContainer, owners, payloadTypes } from '$lib/models';
	import type { AnyContainer, Container, IndicatorContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: Container;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({ ...state, containerDetailView: { tabs: [] } }));

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers.find(isMeasureContainer);

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = paramsFromURL($page.url);
			query.set('view', guid);
			return `#${query.toString()}`;
		}
	}

	let indicatorsRequest: Promise<IndicatorContainer[]> = new Promise(() => []);

	onMount(() => {
		if ('objective' in container.payload && container.payload.objective.length > 0) {
			indicatorsRequest = fetchContainers({
				organization: [container.organization],
				payloadType: [payloadTypes.enum.indicator]
			}) as Promise<IndicatorContainer[]>;
		}
	});
</script>

<article class="details">
	<slot name="data">
		{#if 'summary' in container.payload}
			<div class="summary">
				<h3>{$_('summary')}</h3>
				{container.payload.summary ?? ''}
			</div>
		{/if}
		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
		{/if}
		{#if isContainerWithObjective(container)}
			<div class="objective">
				<h3>{$_('objectives')}</h3>
				{#await indicatorsRequest then indicators}
					{@const indicatorsByGuid = new Map(indicators.map((ic) => [ic.guid, ic]))}
					{#each container.payload.objective as objective}
						{@const indicator = indicatorsByGuid.get(objective.indicator)}
						{#if indicator}
							<IndicatorChart
								container={indicator}
								containersWithObjectives={[container]}
								showObjectives
							>
								<a href="/indicator/{indicator.guid}" slot="caption">{indicator.payload.title}</a>
							</IndicatorChart>
						{/if}
					{/each}
				{/await}
			</div>
		{/if}
		{#if 'progress' in container.payload}
			<div class="progress">
				<h3>{$_('progress')}</h3>
				<Progress value={container.payload.progress} />
			</div>
		{/if}
		{#if isContainerWithObjective(container)}
			<TaskCarousel {container} />
		{/if}
	</slot>

	<slot name="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>
		{#if measure}
			<div class="meta">
				<h3 class="meta-key">{$_('measure')}</h3>
				<p class="meta-value">
					<a href={containerURL(measure.payload.type, measure.guid)}>
						{$_(measure.payload.title)}
					</a>
				</p>
			</div>
		{/if}
		<div class="meta">
			<h3 class="meta-key">{$_('owned_by')}</h3>
			<ul class="meta-value">
				{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
					<li>{owner.payload.name}</li>
				{/each}
			</ul>
		</div>
		{#if 'audience' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('audience')}</h3>
				<ul class="meta-value">
					{#each container.payload.audience as audience}
						<li>{$_(audience)}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if 'fulfillmentDate' in container.payload && container.payload.fulfillmentDate}
			<div class="meta">
				<h3 class="meta-key">{$_('fulfillment_date')}</h3>
				<p class="meta-value">
					{$date(new Date(container.payload.fulfillmentDate), { format: 'medium' })}
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
				<li>{$date(container.valid_from, { format: 'medium' })}</li>
			</ul>
		</div>
	</slot>
</article>
