<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import GoalProperties from '$lib/components/GoalProperties.svelte';
	import {
		type Container,
		type ContainerWithEffect,
		type GoalContainer,
		isContainerWithEffect,
		isEffectContainer,
		isPartOf,
		isPartOfMeasure,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { ability, addEffectState, applicationState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: GoalContainer;
		relatedContainers: any[];
		revisions: any[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

	let measure = $derived(
		relatedContainers.filter(isContainerWithEffect).find((rc) => isPartOfMeasure(rc)(container))
	);

	let effect = $derived(relatedContainers.filter(isEffectContainer).find(isPartOf(container)));

	async function addEffect(target: Container, measure: ContainerWithEffect) {
		const params = new URLSearchParams([
			[overlayKey.enum['indicator-catalog'], ''],
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

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<GoalProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				bind:value={container.payload.description}
			/>
		{/key}

		{#if measure && (effect || $mayCreateContainer(payloadTypes.enum.effect, container.managed_by))}
			<div class="detail-tab" id="effect">
				<h3>{$_('effect')}</h3>
				<ul class="carousel">
					{#if effect}
						<li>
							<Card container={effect} {relatedContainers} />
						</li>
					{:else if $applicationState.containerDetailView.editable && $mayCreateContainer(payloadTypes.enum.effect, container.managed_by)}
						<li>
							<button
								aria-label={$_('add_item')}
								class="card"
								onclick={() => addEffect(container, measure)}
								type="button"
							>
								<PlusSmall />
							</button>
						</li>
					{:else}
						<li>&nbsp;</li>
					{/if}
				</ul>
			</div>
		{:else}
			<div class="details-tab" id="objectives">
				<h3>{$_('objectives')}</h3>
				<EditableObjectiveCarousel
					{container}
					editable={$applicationState.containerDetailView.editable}
					{relatedContainers}
				/>
			</div>
		{/if}

		<div class="details-tab" id="tasks">
			<h3>{$_('tasks')}</h3>
			<EditableTaskCarousel {container} editable={$applicationState.containerDetailView.editable} />
		</div>
	{/snippet}
</EditableContainerDetailView>

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		grid-row: 1 / 4;
		min-height: 6rem;
		justify-content: center;
	}

	.card :global(svg) {
		height: 4rem;
		width: 4rem;
	}
</style>
