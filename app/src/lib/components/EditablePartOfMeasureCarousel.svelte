<script lang="ts">
	import { getContext } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import {
		type AnyContainer,
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
		relatedContainers: AnyContainer[];
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

<Carousel
	addItem={createContainer}
	items={parts}
	mayAddItem={$mayCreateContainer(payloadType, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={relatedContainers.filter(
				({ payload, relation }) =>
					payload.type === payloadTypes.enum.indicator ||
					relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
