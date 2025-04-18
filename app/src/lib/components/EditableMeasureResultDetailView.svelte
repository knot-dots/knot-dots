<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/heroicons/plus-solid';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import {
		type AnyContainer,
		type Container,
		type ContainerWithEffect,
		isContainerWithEffect,
		isEffectContainer,
		isPartOf,
		isPartOfMeasure,
		type MeasureResultContainer,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { ability, addEffectState, applicationState, mayCreateContainer } from '$lib/stores';

	export let container: MeasureResultContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: measure = relatedContainers
		.filter(isContainerWithEffect)
		.find((rc) => isPartOfMeasure(rc)(container));

	$: effect = relatedContainers.filter(isEffectContainer).find(isPartOf(container));

	async function addEffect(target: MeasureResultContainer, measure: ContainerWithEffect) {
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

<EditableContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		<EditableMeasure {container} editable={$applicationState.containerDetailView.editable} />

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
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.description}
		/>

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
								type="button"
								on:click={() => addEffect(container, measure)}
							>
								<Plus />
							</button>
						</li>
					{:else}
						<li>&nbsp;</li>
					{/if}
				</ul>
			</div>
		{/if}

		<div class="detail-tab" id="tasks">
			<h3>{$_('tasks')}</h3>
			<EditableTaskCarousel {container} editable={$applicationState.containerDetailView.editable} />
		</div>
	</svelte:fragment>
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
