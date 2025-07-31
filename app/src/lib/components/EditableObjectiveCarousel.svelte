<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import {
		type AnyContainer,
		type Container,
		isObjectiveContainer,
		isOverlayKey,
		isPartOf,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { addObjectiveState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: Container;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let { container, editable = false, relatedContainers }: Props = $props();

	let parts = $derived(relatedContainers.filter(isObjectiveContainer).filter(isPartOf(container)));

	function addItemURL(url: URL) {
		const params = paramsFromFragment(url);

		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadTypes.enum.objective],
			[predicates.enum['is-part-of'], container.guid],
			[predicates.enum['is-objective-for'], container.guid]
		]);

		return `#${newParams.toString()}`;
	}

	async function addObjective(target: Container) {
		const params = new URLSearchParams([
			[overlayKey.enum['indicator-catalog'], ''],
			['alreadyInUse', '']
		]);

		if ('category' in container.payload) {
			for (const category of container.payload.category) {
				params.append('category', category);
			}
		}

		if ('topic' in container.payload) {
			for (const topic of container.payload.topic) {
				params.append('topic', topic);
			}
		}

		$addObjectiveState = { target };

		await goto(`#${params.toString()}`);
	}
</script>

<Carousel
	addItem={() => addObjective(container)}
	items={parts}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.objective, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			{container}
			relatedContainers={relatedContainers.filter(({ relation }) =>
				relation.some(({ object, subject }) => [object, subject].includes(container.guid))
			)}
		/>
	{/snippet}
</Carousel>
