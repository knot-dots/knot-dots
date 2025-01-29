<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Pencil from '~icons/heroicons/pencil-solid';
	import Card from '$lib/components/Card.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		type Container,
		isContainerWithEffect,
		isContainerWithObjective,
		isMeasureResultContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: OrganizationContainer | OrganizationalUnitContainer;
	export let containersRelatedToIndicators: Container[];
	export let indicators: Container[];
	export let measures: Container[];
	export let strategies: Container[];
</script>

<article class="details">
	<h2 class="details-title">
		{#if 'image' in container.payload}
			<img alt="logo" class="logo" src={container.payload.image} />
		{/if}
		{container.payload.name}
		{#if $ability.can('update', container)}
			<a
				href="{container.guid}/edit"
				class="button button-square quiet"
				data-sveltekit-replacestate
			>
				<Pencil />
			</a>
		{/if}
	</h2>

	<slot name="data">
		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
		{/if}
	</slot>

	{#if container.payload.boards.includes('board.indicators')}
		<div class="indicators">
			<h3>{$_('indicators')}</h3>
			<ul class="carousel">
				{#each indicators as indicator}
					{@const relatedContainers = [
						...containersRelatedToIndicators.filter(({ relation }) =>
							relation.some(({ object }) => object === indicator.guid)
						),
						...containersRelatedToIndicators.filter(isContainerWithEffect),
						...containersRelatedToIndicators.filter(isMeasureResultContainer),
						...containersRelatedToIndicators.filter(isContainerWithObjective)
					]}
					<li>
						<Card container={indicator} {relatedContainers} />
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="strategies">
		<h3>{$_('strategies')}</h3>
		<ul class="carousel">
			{#each strategies as strategy}
				<li>
					<Card container={strategy} />
				</li>
			{/each}
		</ul>
	</div>

	<div class="measures">
		<h3>{$_('measures')}</h3>
		<ul class="carousel">
			{#each measures as measure}
				<li>
					<Card container={measure} />
				</li>
			{/each}
		</ul>
	</div>
</article>

<style>
	.details-title {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.details-title > a {
		margin-left: auto;
	}
</style>
