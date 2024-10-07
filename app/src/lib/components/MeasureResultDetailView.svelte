<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		type AnyContainer,
		type Container,
		isMeasureContainer,
		isPartOf,
		isPartOfMeasure,
		type MeasureContainer,
		type MeasureResultContainer,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { addEffectState, mayCreateContainer } from '$lib/stores';
	import { isEffectContainer } from '$lib/models.js';
	import Card from '$lib/components/Card.svelte';

	export let container: MeasureResultContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: measure = relatedContainers
		.filter(isMeasureContainer)
		.find((rc) => isPartOfMeasure(rc)(container));

	$: effect = relatedContainers.filter(isEffectContainer).find(isPartOf(container));

	async function addEffect(target: MeasureResultContainer, measure: MeasureContainer) {
		const params = new URLSearchParams([
			[overlayKey.enum.create, payloadTypes.enum.indicator],
			['alreadyInUse', '']
		]);

		for (const category of measure.payload.category) {
			params.append('category', category);
		}

		for (const topic of measure.payload.topic) {
			params.append('topic', topic);
		}

		for (const measureType of measure.payload.measureType) {
			params.append('measureType', measureType);
		}

		$addEffectState = { target };

		await goto(`#${params.toString()}`);
	}
</script>

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<div class="description">
			<h3>{$_('description')}</h3>
			<Viewer value={container.payload.description} />
		</div>

		{#if measure && (effect || $mayCreateContainer(payloadTypes.enum.effect, container.managed_by))}
			<div class="effect">
				<h3>{$_('effect')}</h3>
				{#if effect}
					<Card container={effect} {relatedContainers} />
				{:else}
					<button type="button" on:click={() => addEffect(container, measure)}>
						<PlusSmall />{$_('add_item')}
					</button>
				{/if}
			</div>
		{/if}
	</svelte:fragment>
</ContainerDetailView>
