<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
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
			({ revision }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-measured-by'] && object == revision
				) > -1
		);
	$: measure = relatedContainers.find(isContainerWithEffect);
</script>

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if indicator}
			<IndicatorChart container={indicator} {relatedContainers} showEffects />
		{/if}

		{#if container.payload.description}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
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
