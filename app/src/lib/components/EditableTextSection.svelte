<script lang="ts">
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import { type AnyPayload, type Container, type TextPayload } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<TextPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();
</script>

<header>
	{#if editable && $ability.can('update', container)}
		<svelte:element
			this={heading}
			bind:textContent={container.payload.title}
			class="details-heading"
			contenteditable="plaintext-only"
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
			role="heading"
		></svelte:element>
	{:else}
		<svelte:element this={heading} class="details-heading" contenteditable="false">
			{container.payload.title}
		</svelte:element>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if editable && $ability.can('update', container)}
	<Editor bind:value={container.payload.body} />
{:else}
	<Viewer value={container.payload.body} />
{/if}
