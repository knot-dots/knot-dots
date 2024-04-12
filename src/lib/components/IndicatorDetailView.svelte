<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Pencil from '~icons/heroicons/pencil-solid';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { tab } from './IndicatorTabs.svelte';
	import type { IndicatorTab } from '$lib/components/IndicatorTabs.svelte';
	import Card from '$lib/components/Card.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isContainerWithEffect,
		isContainerWithObjective,
		isStrategyContainer,
		owners
	} from '$lib/models';
	import type {
		AnyContainer,
		Container,
		ContainerWithObjective,
		IndicatorContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { sdgIcons } from '$lib/theme/models';

	export let container: IndicatorContainer;
	export let containersWithObjectives: ContainerWithObjective[] = [];
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let currentTab: IndicatorTab = tab.enum.all;
	let showEffects = true;
	let showObjectives = true;

	$: {
		const parseResult = tab.safeParse(paramsFromURL($page.url).get('tab'));
		if (parseResult.success) {
			currentTab = parseResult.data;
		}

		if (currentTab == tab.enum.historical_values) {
			showEffects = false;
			showObjectives = false;
		} else if (currentTab == tab.enum.objectives) {
			showEffects = false;
			showObjectives = true;
		} else if (currentTab == tab.enum.measures) {
			showEffects = true;
			showObjectives = false;
		} else {
			showEffects = true;
			showObjectives = true;
		}
	}

	applicationState.update((state) => ({
		...state,
		containerDetailView: { tabs: [] }
	}));
</script>

<article class="details">
	<h2 class="details-title">
		{container.payload.title}
		{#if $ability.can('update', container)}
			<a class="button button-square quiet" href="#view={container.guid}&edit">
				<Pencil />
			</a>
		{/if}
	</h2>

	<div class="details-tab" id="basic-data">
		<div class="intro">
			{#if currentTab === tab.enum.historical_values}
				<Viewer value={container.payload.historicalValuesIntro} />
			{:else if currentTab === tab.enum.objectives}
				<Viewer value={container.payload.objectivesIntro} />
			{:else if currentTab === tab.enum.measures}
				<Viewer value={container.payload.measuresIntro} />
			{:else}
				<Viewer value={container.payload.description} />
			{/if}
		</div>

		<IndicatorChart
			{container}
			{containersWithObjectives}
			{relatedContainers}
			{showEffects}
			{showObjectives}
		/>

		{#if showEffects}
			<div class="measures">
				<h3>{$_('measures')}</h3>
				<ul class="carousel">
					{#each relatedContainers.filter((c) => isContainerWithEffect(c)) as measure}
						<li>
							<Card --height="100%" container={measure} />
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if showObjectives}
			<div class="objectives">
				<h3>{$_('objectives')}</h3>
				<ul class="carousel">
					{#each relatedContainers.filter(isContainerWithObjective) as objective}
						<li>
							<Card --height="100%" container={objective} />
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="strategies">
			<h3>{$_('strategies')}</h3>
			<ul class="carousel">
				{#each relatedContainers.filter((c) => isStrategyContainer(c)) as strategy}
					<li>
						<Card --height="100%" container={strategy} />
					</li>
				{/each}
			</ul>
		</div>

		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>

		{#if 'topic' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('topic.label')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each container.payload.topic as topic}
						<li>{$_(topic)}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if 'category' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('category')}</h3>
				<ul class="meta-value meta-value--category">
					{#each container.payload.category as category}
						<li>
							<img
								src={sdgIcons.get(category)}
								alt={$_(category)}
								title={$_(category)}
								width="66"
								height="66"
							/>
						</li>
					{/each}
				</ul>
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
	</div>
</article>
