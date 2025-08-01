<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { type AnyContainer, type TextContainer } from '$lib/models';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';

	interface Props {
		container: TextContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	const init: Attachment = (element) => {
		if (container.payload.title == '') {
			(element as HTMLElement).focus();
		}
	};
</script>

<header>
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
		<ul class="inline-actions is-visible-on-hover">
			<li><ContainerSettingsDropdown bind:container bind:relatedContainers /></li>
		</ul>
	{/if}
</header>

{#if editable}
	<!-- svelte-ignore binding_property_non_reactive -->
	<Editor bind:value={container.payload.body} />
{:else}
	<Viewer value={container.payload.body} />
{/if}
