<script lang="ts">
  import {_} from 'svelte-i18n';
  import type {Attachment} from 'svelte/attachments';
  import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
  import EditablePlainText from '$lib/components/EditablePlainText.svelte';
  import Editor from '$lib/components/Editor.svelte';
  import Viewer from '$lib/components/Viewer.svelte';
  import ArrowRight from '~icons/knotdots/arrow-right';
  import ExclamationCircle from '~icons/knotdots/exclamation-circle';
  import {
    type AnyContainer,
    type TeaserContainer,
    type InfoBoxContainer,
    type TeaserHighlightContainer,
    type QuoteContainer,
    isQuoteContainer
  } from '$lib/models';
  import {ability} from '$lib/stores';
  import EditableImageInline from '$lib/components/EditableImageInline.svelte';
  import {Pane, Splitpanes} from 'svelte-splitpanes';
  import {createPopover} from 'svelte-headlessui';
  import {createPopperActions} from 'svelte-popperjs';
  import requestSubmit from '$lib/client/requestSubmit';

  interface Props {
    container: TeaserContainer | InfoBoxContainer | TeaserHighlightContainer | QuoteContainer;
    editable?: boolean;
    heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    parentContainer: AnyContainer;
    relatedContainers: AnyContainer[];
  }

  let {
    container = $bindable(),
    editable = false,
    heading,
    parentContainer = $bindable(),
    relatedContainers = $bindable()
  }: Props = $props();

  const init: Attachment = (element) => {
    if (container.payload.title == '') {
      (element as HTMLElement).focus();
    }
  };

  const cssClassMap: Record<string, string> = {
    teaser: 'teaser',
    info_box: 'info-box',
    teaser_highlight: 'teaser-highlight',
    quote: 'blockquote'
  };

  // Define the allowed sizes
  const allowedSizes = [0, 33, 50, 66, 100];
  let paneSize = $state(50); // Initial size
  let isResizing = $state(false);
  let splitpanesRef = $state<HTMLElement>();

  function handleResize(event: any) {
    const currentSize = event.detail[0].size;

    // Check if we're within 5% of any allowed size
    const snapThreshold = 5;
    const nearestSize = allowedSizes.find(size =>
      Math.abs(size - currentSize) <= snapThreshold
    );

    if (nearestSize && !isResizing) {
      paneSize = nearestSize;
    } else {
      paneSize = currentSize;
    }
  }

  function handleResizeStart() {
    isResizing = true;
  }

  function handleResizeEnd(event: any) {
    isResizing = false;
    const currentSize = event.detail[0].size;
    snapToClosestSize(currentSize);
  }

  function snapToClosestSize(currentSize: number) {
    paneSize = allowedSizes.reduce((prev, curr) =>
      Math.abs(curr - currentSize) < Math.abs(prev - currentSize) ? curr : prev
    );
  }

  let paneClass = $derived(() => {
    switch (paneSize) {
      case 0:
        return 'pane-0';
      case 33:
        return 'pane-33';
      case 50:
        return 'pane-50';
      case 66:
        return 'pane-66';
      case 100:
        return 'pane-100';
      default:
        return 'pane-50';
    }
  });

  let cssClass = $derived(cssClassMap[container.payload.type] ?? 'teaser');
  let canUpdate = $derived(editable && $ability.can('update', container));
  let isInfoBox = $derived(container.payload.type === 'info_box');
  let hasLink = $derived(container.payload.link && container.payload.linkCaption);
  let gridClass = $derived(container.payload.image ? 'grid-2-cols grid-66-33' : '');
</script>

<div style="position: relative" class={cssClass}>
	{#if canUpdate}
		<ul class="absolute-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers bind:parentContainer/>
			</li>
		</ul>
	{/if}

	<div class="splitpanes-container" bind:this={splitpanesRef}>
		<!-- Position markers -->
		<div class="position-markers">
			{#each allowedSizes as size}
				<div
						class="position-marker"
						class:active={paneSize === size}
						style="left: {size}%"
				>

					<div class="marker-label"></div>
				</div>
			{/each}
		</div>
		<Splitpanes
				theme="modern-theme"
				on:resize={handleResize}
				on:splitter-click={handleResizeStart}
				on:resized={handleResizeEnd}
		>
			<Pane bind:size={paneSize} minSize={0} maxSize={100}>
				<div class={paneClass()}>
					A
				</div>
			</Pane>
			<Pane>
				<div class="pane-b">
					B
				</div>
			</Pane>
		</Splitpanes>
	</div>
	<div class={canUpdate ? 'grid-2-cols grid-66-33' : gridClass}>
		<div>
			{#if !isQuoteContainer(container)}
				<header>
					{#if isInfoBox}
						<span style="color: var(--color-orange-500)">
							<ExclamationCircle/>
						</span>
					{/if}
					{#if canUpdate}
						<svelte:element
								this={heading}
								bind:textContent={container.payload.title}
								class="details-heading"
								contenteditable="plaintext-only"
								role="textbox"
								tabindex="0"
								onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
								{@attach init}
						></svelte:element>
					{:else}
						<svelte:element this={heading} class="details-heading" contenteditable="false">
							{container.payload.title}
						</svelte:element>
					{/if}
				</header>
			{/if}
			<div class="teaser--content">
				{#if canUpdate}
					<Editor bind:value={container.payload.body}/>
				{:else}
					<Viewer value={container.payload.body}/>
				{/if}
			</div>
		</div>
		<EditableImageInline
				{editable}
				label={$_(canUpdate ? 'upload.image.add' : 'cover')}
				bind:value={container.payload.image}
		/>
	</div>

	{#if !isQuoteContainer(container)}
		<div class="flex mt-3" class:flex-column={!canUpdate}>
			{#if canUpdate}
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
			{:else if hasLink}
				<div class="flex-end">
					<a class="button button--action" href={container.payload.link}>
						<ArrowRight/> {container.payload.linkCaption}</a
					>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
    header {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

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

    .info-box h3,
    .teaser-highlight h3 {
        min-height: unset;
    }

    .info-box h3 {
        color: var(--color-yellow-900);
    }

    .teaser-highlight h3 {
        color: var(--color-teal-900);
    }

    .info-box {
        margin: 0 calc(var(--details-section-padding-x) * -1);
        padding: var(--details-section-padding-y) var(--details-section-padding-x);
        border: 1px solid var(--color-yellow-200);
        border-radius: 1rem;
        background-color: var(--color-yellow-050);
    }

    .info-box .teaser--content {
        color: var(--color-yellow-700);
    }

    .info-box .button--action {
        background-color: var(--color-yellow-600);
        color: var(--color-white);
        border-color: var(--color-yellow-600);
    }

    .teaser-highlight {
        margin: 0 calc(var(--details-section-padding-x) * -1);
        padding: var(--details-section-padding-y) var(--details-section-padding-x);
        border: 1px solid var(--color-teal-200);
        border-radius: 1rem;
        background-color: var(--color-teal-050);
    }

    .teaser-highlight .teaser--content {
        color: var(--color-teal-700);
    }

    .teaser-highlight .button--action {
        background-color: var(--color-gray-800);
        color: var(--color-white);
        border-color: var(--color-gray-600);
    }

    .quote {
        background-color: red;
    }

    .splitpanes-container {
        position: relative;
        height: 300px; /* Adjust as needed */
    }

    .position-markers {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100%;
        pointer-events: none;
        z-index: 10;
    }

    .position-marker {
        position: absolute;
        top: 0;
        height: 100%;
        pointer-events: none;
        transform: translateX(-50%);
        transition: opacity 0.2s ease;
    }


    .marker-label {
        position: absolute;
        top: -2rem;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--color-gray-200);
        color: white;
        padding: 0.25rem;
        border-radius: 0.25rem;
        font-size: 0;
        white-space: nowrap;
        opacity: 1;
        transition: opacity 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .position-marker.active .marker-label {
        opacity: 1;
        background-color: var(--color-gray-500);
    }

</style>
