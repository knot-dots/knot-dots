<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import {
		isContainerWithEffect,
		isIndicatorContainer,
		overlayKey,
		overlayURL,
		predicates
	} from '$lib/models';
	import type { AnyContainer, Container, EffectContainer } from '$lib/models';

	export let container: EffectContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: indicator = relatedContainers
		.filter(isIndicatorContainer)
		.find(
			({ guid }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-measured-by'] && object == guid
				) > -1
		);
	$: measure = relatedContainers.find(isContainerWithEffect);
</script>

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if indicator}
			<EffectChart {container} {relatedContainers} showLegend />
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
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
