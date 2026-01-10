<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import type { KnowledgeContainer } from '$lib/models';

	interface Props {
		container: KnowledgeContainer;
		editable?: boolean;
	}

	let { container, editable = false }: Props = $props();
</script>

<Card {container}></Card>

<style>
</style>
