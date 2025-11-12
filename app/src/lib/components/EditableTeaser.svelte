<script lang="ts">
  import type { Attachment } from 'svelte/attachments';
  import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import Viewer from '$lib/components/Viewer.svelte';
  import { type AnyContainer, type TeaserContainer } from '$lib/models';
  import { ability } from '$lib/stores';

  interface Props {
    container: TeaserContainer;
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
	{#if editable && $ability.can('update', container)}
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
<div>

Some content...
</div>

