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
  const allowedSizes = ['0-100', '33-66', '50-50', '66-33', '100-0'];
  const sizeToNumber = {
    '0-100': 0,
    '33-66': 33,
    '50-50': 50,
    '66-33': 66,
    '100-0': 100
  };
  const numberToSize = {
    0: '0-100',
    33: '33-66',
    50: '50-50',
    66: '66-33',
    100: '100-0'
  };

  let currentColSize = $state(container.payload.colSize || '33-66');
  let paneSize = $state(sizeToNumber[currentColSize as keyof typeof sizeToNumber] || 33);

  let isResizing = $state(false);
  let splitpanesRef = $state<HTMLElement>();
  let colSizeInputRef = $state<HTMLInputElement>();

  function handleResize(event: any) {
    const currentSize = event.detail[0].size;
    const numericSizes = Object.keys(sizeToNumber).map(k => sizeToNumber[k as keyof typeof sizeToNumber]);

    // Check if we're within 5% of any allowed size
    const snapThreshold = 5;
    const nearestSize = numericSizes.find(size =>
      Math.abs(size - currentSize) <= snapThreshold
    );

    if (nearestSize !== undefined && !isResizing) {
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
    updateContainer();
  }

  function snapToClosestSize(currentSize: number) {
    const numericSizes = Object.keys(sizeToNumber).map(k => sizeToNumber[k as keyof typeof sizeToNumber]);
    paneSize = numericSizes.reduce((prev, curr) =>
      Math.abs(curr - currentSize) < Math.abs(prev - currentSize) ? curr : prev
    );
  }

  function updateContainer() {
    const stringSize = numberToSize[paneSize as keyof typeof numberToSize] || '33-66';
    currentColSize = stringSize;
    container.payload.colSize = stringSize;
    triggerFormSubmit()
  }

  function setPaneSize(size: string) {
    const numericSize = sizeToNumber[size as keyof typeof sizeToNumber];
    if (numericSize !== undefined) {
      paneSize = numericSize;
      currentColSize = size;
      container.payload.colSize = size;
      updateContainer();
    }
  }

  function triggerFormSubmit() {
    if (colSizeInputRef) {
      colSizeInputRef.value = container.payload.colSize || '';
      colSizeInputRef.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }

  let gridClass = $derived(() => {
    switch (currentColSize) {
      case '0-100':
        return '';
      case '33-66':
        return 'grid-2-cols grid-33-66';
      case '50-50':
        return 'grid-2-cols grid-50-50';
      case '66-33':
        return 'grid-2-cols grid-66-33';
      case '100-0':
        return '';
      default:
        return 'grid-2-cols grid-33-66';
    }
  });

  let cssClass = $derived(cssClassMap[container.payload.type] ?? 'teaser');
  let canUpdate = $derived(editable && $ability.can('update', container));
  let isInfoBox = $derived(container.payload.type === 'info_box');
  let hasLink = $derived(container.payload.link && container.payload.linkCaption);
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
		{#if editable}
			<!-- Position markers -->
			<div class="position-markers">
				{#each allowedSizes as size}
					<div
							class="position-marker"
							class:active={currentColSize === size}
							style="left: {sizeToNumber[size]}%"
					>
						<button class="marker-label" aria-label={$_('teaser.position_marker.' + size)}
								onclick={() => setPaneSize(size)}
								type="button"
						></button>
					</div>
				{/each}
			</div>
		{/if}
		<Splitpanes
				theme={editable ? "modern-theme" : "no-splitter"}
				class={gridClass()}
				on:resize={handleResize}
				on:splitter-click={handleResizeStart}
				on:resized={handleResizeEnd}
		>
			<Pane bind:size={paneSize} minSize={0} maxSize={100}>
				<div class="splitpanes__pane--wrap">
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
			</Pane>
			<Pane>
				<div class="splitpanes__pane--wrap">
					<EditableImageInline
							{editable}
							label={$_(canUpdate ? 'upload.image.add' : 'cover')}
							bind:value={container.payload.image}
					/>
				</div>
			</Pane>
		</Splitpanes>

		<input type="hidden" name="colSize" bind:this={colSizeInputRef} bind:value={container.payload.colSize}/>
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
        height: 100%;
    }

    .splitpanes-container .position-markers {
        position: absolute;

        left: 0;
        right: 0;
        height: 100%;
        pointer-events: none;
        top: -10px;
        opacity: 0;
        z-index: 10;
        transition: all 0.2s ease;
    }

    .splitpanes-container:hover .position-markers {
        opacity: 1;
        top: 0;
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
        border-radius: 1rem;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.25rem;
        pointer-events: all;
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
