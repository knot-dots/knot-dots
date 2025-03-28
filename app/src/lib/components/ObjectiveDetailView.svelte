<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isContainerWithObjective,
		isIndicatorContainer,
		overlayKey,
		overlayURL,
		predicates
	} from '$lib/models';
	import type { AnyContainer, Container, ObjectiveContainer } from '$lib/models';

	export let container: ObjectiveContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: indicator = relatedContainers
		.filter(isIndicatorContainer)
		.find(
			({ guid }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-objective-for'] && object == guid
				) > -1
		);
	$: goal = relatedContainers
		.filter(isContainerWithObjective)
		.find(
			(candidate) =>
				container.relation.findIndex(
					({ object, predicate, subject }) =>
						container.guid === subject &&
						candidate.guid === object &&
						predicate === predicates.enum['is-part-of']
				) > -1
		);
</script>

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if indicator}
			<ObjectiveChart {container} {relatedContainers} />
		{/if}

		{#if container.payload.description}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		{#if goal}
			<div class="meta">
				<h3 class="meta-key">{$_('goal')}</h3>
				<p class="meta-value">
					<a href={overlayURL($page.url, overlayKey.enum.view, goal.guid)}>
						{$_(goal.payload.title)}
					</a>
				</p>
			</div>
		{/if}

		{#if indicator}
			<div class="meta">
				<h3 class="meta-key">{$_('indicator_type')}</h3>
				<ul class="meta-value">
					{#each indicator.payload.indicatorType as indicatorType}
						<li>{$_(indicatorType)}</li>
					{/each}
				</ul>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('indicator_category')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each indicator.payload.indicatorCategory as indicatorCategory}
						<li>{$_(indicatorCategory)}</li>
					{/each}
				</ul>
			</div>
		{/if}
	</svelte:fragment>
</ContainerDetailView>
