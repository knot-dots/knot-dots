<script lang="ts">
	import { _ } from 'svelte-i18n';
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
	.knowledge-meta {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-gray-600);
		margin-bottom: 0.5rem;
	}

	.category {
		text-transform: capitalize;
		font-weight: 500;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tag {
		background: var(--color-gray-100);
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		color: var(--color-gray-700);
	}
</style>
