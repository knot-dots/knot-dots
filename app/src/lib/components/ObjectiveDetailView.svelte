<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import { isIndicatorContainer, predicates } from '$lib/models';
	import type { AnyContainer, Container, ObjectiveContainer } from '$lib/models';

	export let container: ObjectiveContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: indicator = relatedContainers
		.filter(isIndicatorContainer)
		.find(
			({ revision }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-objective-for'] && object == revision
				) > -1
		);
</script>

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if indicator}
			<IndicatorChart container={indicator} {relatedContainers} showObjectives />
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
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
