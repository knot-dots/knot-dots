<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableGoalType from '$lib/components/EditableGoalType.svelte';
	import EditableHierarchyLevel from '$lib/components/EditableHierarchyLevel.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableParent from '$lib/components/EditableParent.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import {
		type Container,
		type ContainerWithEffect,
		type GoalContainer,
		isContainerWithEffect,
		isEffectContainer,
		isPartOf,
		isPartOfMeasure,
		isStrategyContainer,
		overlayKey,
		payloadTypes,
		predicates
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

	let strategy = $derived(
		relatedContainers
			.filter(isStrategyContainer)
			.find(
				(candidate) =>
					container.relation.findIndex(
						(r) =>
							r.predicate === predicates.enum['is-part-of-strategy'] &&
							r.object === candidate.guid &&
							candidate.guid !== container.guid
					) > -1
			)
	);

	let effect = $derived(relatedContainers.filter(isEffectContainer).find(isPartOf(container)));

	async function addEffect(target: Container, measure: ContainerWithEffect) {
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

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		<EditableGoalType
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.goalType}
		/>

		<EditableHierarchyLevel
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.hierarchyLevel}
		/>

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		{#if measure}
			<EditableMeasure {container} editable={$applicationState.containerDetailView.editable} />
		{:else}
			<EditableStrategy {container} editable={$applicationState.containerDetailView.editable} />
		{/if}

		<EditableParent {container} editable={$applicationState.containerDetailView.editable} />

		<EditableTopic
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.topic}
		/>

		<EditablePolicyFieldBNK
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.policyFieldBNK}
		/>

		<EditableCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.category}
		/>

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		<EditableOrganization
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<EditableOrganizationalUnit
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet extra()}
		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
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
					{:else if $applicationState.containerDetailView.editable}
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
