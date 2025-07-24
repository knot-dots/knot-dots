<script lang="ts">
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import { type TextContainer } from '$lib/models';

	interface Props {
		container: TextContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

{#if editable}
	<h3
		class="details-title"
		contenteditable="plaintext-only"
		bind:textContent={container.payload.title}
		onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
	></h3>
{:else}
	<h3 class="details-title" contenteditable="false">
		{container.payload.title}
	</h3>
{/if}

<EditableFormattedText {editable} bind:value={container.payload.body} />
