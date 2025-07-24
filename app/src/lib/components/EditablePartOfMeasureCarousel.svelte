<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/heroicons/plus-solid';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		containerOfType,
		type ContainerWithEffect,
		isPartOf,
		isPartOfMeasure,
		type NewContainer,
		type PayloadType,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: ContainerWithEffect;
		editable?: boolean;
		payloadType: PayloadType;
		relatedContainers: Container[];
	}

	let { container, editable = false, payloadType, relatedContainers }: Props = $props();

	let parts = $derived(
		relatedContainers
			.filter(({ payload }) => payload.type == payloadType)
			.filter((rc) => isPartOfMeasure(container)(rc) || isPartOf(container)(rc))
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer() {
		const partOfMeasure = containerOfType(
			payloadType,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		partOfMeasure.relation = [
			{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of'] },
			{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of-measure'] }
		];

		$newContainer = partOfMeasure;

		createContainerDialog.getElement().showModal();
	}
</script>

{#if relatedContainers.length > 0 || $mayCreateContainer(payloadType, container.managed_by)}
	<ul class="carousel" class:editable>
		{#each parts as container}
			<li>
				<Card
					{container}
					relatedContainers={relatedContainers.filter(
						({ payload, relation }) =>
							payload.type === payloadTypes.enum.indicator ||
							relation.some(({ object, subject }) => [object, subject].includes(container.guid))
					)}
				/>
			</li>
		{/each}
		{#if $mayCreateContainer(payloadType, container.managed_by) && editable}
			<li>
				<button aria-label={$_('add_item')} class="card" onclick={createContainer} type="button">
					<Plus />
				</button>
			</li>
		{/if}
	</ul>
{/if}

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
