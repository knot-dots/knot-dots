<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import ArrowRight from '~icons/knotdots/arrow-right';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import {
		type AnyContainer,
		teaserColSizes,
		type TeaserColSize,
		teaserColSizeToNumber,
		teaserNumberToColSize,
		type TeaserLikeContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import EditableImageInline from '$lib/components/EditableImageInline.svelte';
	import { Pane, Splitpanes } from 'svelte-splitpanes';
	import ContainerSectionDropdown from '$lib/components/ContainerSectionDropdown.svelte';

	interface Props {
		container: TeaserLikeContainer;
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

	const cssClassMap: Record<string, string> = {
		teaser: 'teaser',
		info_box: 'info-box',
		teaser_highlight: 'teaser-highlight',
		quote: 'blockquote',
		col_content: 'teaser'
	};

	let currentColSize = $state(container.payload.colSize || '33-66');
	let paneSize = $state(
		teaserColSizeToNumber[currentColSize as keyof typeof teaserColSizeToNumber] || 33
	);

	let isResizing = $state(false);
	let splitpanesRef = $state<HTMLElement>();
	let colSizeInputRef = $state<HTMLInputElement>();

	function handleResize(event: any) {
		const currentSize = event.detail[0].size;
		const numericSizes = Object.values(teaserColSizeToNumber);

		// Check if we're within 5% of any allowed size
		const snapThreshold = 5;
		const nearestSize = numericSizes.find((size) => Math.abs(size - currentSize) <= snapThreshold);

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
		const numericSizes = Object.values(teaserColSizeToNumber);
		paneSize = numericSizes.reduce((prev, curr) =>
			Math.abs(curr - currentSize) < Math.abs(prev - currentSize) ? curr : prev
		);
	}

	function updateContainer() {
		const stringSize =
			teaserNumberToColSize[paneSize as keyof typeof teaserNumberToColSize] || '33-66';
		currentColSize = stringSize;
		container.payload.colSize = stringSize;
		triggerFormSubmit();
	}

	function setPaneSize(size: TeaserColSize) {
		const numericSize = teaserColSizeToNumber[size as keyof typeof teaserColSizeToNumber];
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
			colSizeInputRef.dispatchEvent(new Event('input', { bubbles: true }));
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
	let hasLink = $derived(
		container.payload.link && container.payload.linkCaption && container.payload.linkEnable
	);
	let hasLinkRight = $derived(
		container.payload.linkRight &&
			container.payload.linkCaptionRight &&
			container.payload.linkEnableRight
	);
</script>

<div style="position: relative" class={cssClass}>
	<div class="splitpanes-container" bind:this={splitpanesRef}>
		{#if editable}
			<!-- Position markers -->
			<div class="position-markers">
				{#each teaserColSizes.options as size (size)}
					<div
						class="position-marker"
						class:active={currentColSize === size}
						style="left: {teaserColSizeToNumber[size]}%"
					>
						<button
							class="marker-label"
							aria-label={$_('teaser.position_marker.' + size)}
							onclick={() => setPaneSize(size)}
							type="button"
						></button>
					</div>
				{/each}
			</div>
		{/if}
		<Splitpanes
			theme={editable ? 'modern-theme' : 'modern-theme no-splitter'}
			class={gridClass()}
			on:resize={handleResize}
			on:splitter-click={handleResizeStart}
			on:resized={handleResizeEnd}
		>
			<Pane bind:size={paneSize} minSize={0} maxSize={100}>
				<div
					class="splitpanes__pane--wrap splitpanes__pane--wrap--left"
					class:is-hidden={paneSize === 0}
				>
					{#if canUpdate}
						<ul class="absolute-actions is-visible-on-hover">
							<li>
								<ContainerSectionDropdown
									bind:container
									bind:relatedContainers
									bind:parentContainer
								/>
							</li>
						</ul>
					{/if}

					{#if container.payload.imageEnable}
						<EditableImageInline
							{editable}
							label={$_(canUpdate ? 'upload.image.add' : 'cover')}
							bind:value={container.payload.image}
						/>
					{/if}
					{#if container.payload.titleEnable}
						<header class="">
							{#if isInfoBox}
								<span style="color: var(--color-orange-500)">
									<ExclamationCircle />
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
								></svelte:element>
							{:else}
								<svelte:element this={heading} class="details-heading" contenteditable="false">
									{container.payload.title}
								</svelte:element>
							{/if}
						</header>
					{/if}

					{#if container.payload.textEnable}
						<div class="teaser--content">
							{#if canUpdate}
								<Editor bind:value={container.payload.body} />
							{:else}
								<Viewer value={container.payload.body} />
							{/if}
						</div>
					{/if}

					{#if hasLink}
						<div class="flex" class:flex-column={!canUpdate}>
							<div class="flex-end">
								<a class="button button--action" href={container.payload.link}>
									<ArrowRight /> {container.payload.linkCaption}</a
								>
							</div>
						</div>
					{/if}
				</div>
			</Pane>
			<Pane>
				<div
					class="splitpanes__pane--wrap splitpanes__pane--wrap--right"
					class:is-hidden={paneSize === 100}
				>
					{#if canUpdate}
						<ul class="absolute-actions is-visible-on-hover">
							<li>
								<ContainerSectionDropdown
									bind:container
									bind:relatedContainers
									bind:parentContainer
									payloadSuffix="Right"
								/>
							</li>
							<li>
								<ContainerSettingsDropdown
									bind:container
									bind:relatedContainers
									bind:parentContainer
								/>
							</li>
						</ul>
					{/if}
					{#if container.payload.imageEnableRight}
						<EditableImageInline
							{editable}
							label={$_(canUpdate ? 'upload.image.add' : 'cover')}
							bind:value={container.payload.imageRight}
						/>
					{/if}
					{#if container.payload.titleEnableRight}
						<header>
							{#if isInfoBox}
								<span style="color: var(--color-orange-500)">
									<ExclamationCircle />
								</span>
							{/if}
							{#if canUpdate}
								<svelte:element
									this={heading}
									bind:textContent={container.payload.titleRight}
									class="details-heading"
									contenteditable="plaintext-only"
									role="textbox"
									tabindex="0"
									onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
								></svelte:element>
							{:else}
								<svelte:element this={heading} class="details-heading" contenteditable="false">
									{container.payload.titleRight}
								</svelte:element>
							{/if}
						</header>
					{/if}

					{#if container.payload.textEnableRight}
						<div class="teaser--content">
							{#if canUpdate}
								<Editor bind:value={container.payload.bodyRight} />
							{:else}
								<Viewer value={container.payload.bodyRight} />
							{/if}
						</div>
					{/if}

					{#if hasLinkRight}
						<div class="flex" class:flex-column={!canUpdate}>
							<div class="flex-end">
								<a class="button button--action" href={container.payload.linkRight}>
									<ArrowRight /> {container.payload.linkCaptionRight}</a
								>
							</div>
						</div>
					{/if}
				</div>
			</Pane>
		</Splitpanes>

		<input
			type="hidden"
			name="colSize"
			bind:this={colSizeInputRef}
			bind:value={container.payload.colSize}
		/>
	</div>
</div>

<style>
	header {
		display: flex;
		gap: 0.5rem;
		align-items: center;
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
		margin-left: auto;
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
		top: -1rem;
		padding-bottom: 10rem;
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

	.absolute-actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;
		align-items: center;
		background-color: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		position: absolute;
		left: unset;
		right: -0.75rem;
		top: -0.75rem;
	}

	.is-hidden {
		display: none;
	}
</style>
