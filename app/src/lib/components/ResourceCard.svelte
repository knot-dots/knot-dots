<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { type Container, type ResourceV2Container } from '$lib/models';

	interface Props {
		container: ResourceV2Container;
		relatedContainers?: Container[];
	}

	const { container, relatedContainers = [] }: Props = $props();
</script>

<Card {container}></Card>

<style>
</style>
