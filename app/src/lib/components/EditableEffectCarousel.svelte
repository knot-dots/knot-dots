<script lang="ts">
	import { goto } from '$app/navigation';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import {
		type AnyContainer,
		type Container,
		isObjectiveContainer,
		isPartOf,
		overlayKey,
		payloadTypes
	} from '$lib/models';
	import { addEffectState, mayCreateContainer } from '$lib/stores';

	interface Props {
		container: Container;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let { container, editable = false, relatedContainers }: Props = $props();

	let parts = $derived(relatedContainers.filter(isObjectiveContainer).filter(isPartOf(container)));

	async function addEffect(target: Container) {
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

		$addEffectState = { target };

		await goto(`#${params.toString()}`);
	}
</script>

<Carousel
	addItem={() => addEffect(container)}
	items={parts}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.effect, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={relatedContainers.filter(({ relation }) =>
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
