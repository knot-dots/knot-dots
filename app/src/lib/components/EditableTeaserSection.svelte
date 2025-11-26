<script lang="ts">
  import {_} from 'svelte-i18n';
  import type {Attachment} from 'svelte/attachments';
  import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
  import EditablePlainText from '$lib/components/EditablePlainText.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import Viewer from '$lib/components/Viewer.svelte';
  import ArrowRight from '~icons/knotdots/arrow-right';
  import ExclamationCircle from '~icons/knotdots/exclamation-circle';
  import {type AnyContainer, type TeaserContainer, type PayloadType, type InfoBoxContainer} from '$lib/models';
  import {ability} from '$lib/stores';
  import EditableImage from "$lib/components/EditableImage.svelte";

  interface Props {
    container: TeaserContainer | InfoBoxContainer;
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

  const teaserCssClass = (): string => {
    switch (container.payload.type) {
      case "teaser":
        return "teaser";
      case "info_box":
        return "info-box";
      default:
        return "teaser";
    }
  }
</script>
<div class={teaserCssClass()}>
	<header>
		{#if container.payload.type === 'info_box'}
			<ExclamationCircle/>
		{/if}
		{#if editable && $ability.can('update', container)}
			<h3
					bind:textContent={container.payload.title}
					class="details-heading"
					contenteditable="plaintext-only"
					onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
					{@attach init}

			></h3>
		{:else}
			<h3 class="details-heading" contenteditable="false">
				{container.payload.title}
			</h3>
		{/if}

		{#if editable}
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown bind:container bind:relatedContainers/>
				</li>
			</ul>
		{/if}
	</header>

	{#if editable && $ability.can('update', container)}
		<!-- svelte-ignore binding_property_non_reactive -->
		<div class="flex">
		<Editor bind:value={container.payload.body}/>
		<EditableImage {editable} label={$_('cover')} bind:value={container.payload.image} />
		</div>
		<div class="flex mt-3">
			<EditablePlainText
					{editable}
					label={$_('teaser.link_caption')}
					bind:value={container.payload.linkCaption}
			/>
			<EditablePlainText
					{editable}
					label={$_('teaser.link')}
					bind:value={container.payload.link}
			/>
		</div>
	{:else}
		<div class="flex">
			<Viewer value={container.payload.body}/>
			<EditableImage {editable} label={$_('cover')} bind:value={container.payload.image} />
		</div>
		<div class="flex flex-column">
			{#if container.payload.link && container.payload.linkCaption}
				<div class="flex-end">
					<a class="button button--action" href={container.payload.link}>
						<ArrowRight/> {container.payload.linkCaption}</a>
				</div>
			{/if}
		</div>
	{/if}
</div>
<style>
    .mt-3 {
        margin-top: 1rem;
    }

    .flex {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .flex.flex-column {
        align-items: flex-start;
        flex-direction: column;
    }

    .flex-end {
        align-self: flex-end;
    }

	h3 {
		font-size: 1.25rem;
        color: var(--color-yellow-700);
	}

    .info-box {
        color: var(--color-yellow-700);
        margin: 0 -1rem 0 -1rem;
        padding: 1rem;
        border: 1px solid var(--color-yellow-200);
        border-radius: 1rem;
        background-color: var(--color-yellow-050);
    }
</style>
