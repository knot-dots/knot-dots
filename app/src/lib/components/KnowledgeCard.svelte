<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { KnowledgeContainer } from '$lib/models';

	interface Props {
		container: KnowledgeContainer;
	}

	let { container }: Props = $props();
</script>

<Card {container}></Card>

<style>
</style>
