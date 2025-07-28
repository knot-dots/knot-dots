<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { type TextContainer } from '$lib/models';

	interface Props {
		container: TextContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};
</script>

{#if editable}
	<!-- svelte-ignore binding_property_non_reactive -->
	<h2
		bind:textContent={container.payload.title}
		class="details-heading"
		contenteditable="plaintext-only"
		onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
		{@attach init}
	></h2>
{:else}
	<h2 class="details-heading" contenteditable="false">
		{container.payload.title}
	</h2>
{/if}

{#if editable}
	<!-- svelte-ignore binding_property_non_reactive -->
	<Editor bind:value={container.payload.body} />
{:else}
	<Viewer value={container.payload.body} />
{/if}
