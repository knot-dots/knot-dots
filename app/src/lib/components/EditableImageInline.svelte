<script lang="ts">
	import { _ } from 'svelte-i18n';
	import transformFileURL from '$lib/transformFileURL.js';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import UppyImageUploader from '$lib/components/UppyImageUploader.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		altAttribute?: string;
		value: string | undefined;
	}

	let {
		editable = false,
		label,
		value = $bindable(),
		altAttribute = $bindable()
	}: Props = $props();

	const id = crypto.randomUUID();

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'top-start',
		strategy: 'absolute'
	});

	function onSuccess() {
		const form =
			document.querySelector(`[for="${id}"]`)?.closest('form') ||
			document.querySelector(`.dropdown-panel`)?.closest('form');
		if (form) {
			form.requestSubmit();
		}
	}
</script>

{#if editable && !value}
	<UppyImageUploader bind:value {label} mode="placeholder" {onSuccess} />
{:else if value}
	{#if editable}
		<img
			use:popover.button
			alt={altAttribute || $_('logo')}
			class="logo"
			src={transformFileURL(value)}
		/>
	{:else}
		<img alt={altAttribute || $_('logo')} class="logo" src={transformFileURL(value)} />
	{/if}
	{#if $popover.expanded}
		<div class="dropdown-panel" use:popperContent use:popover.panel>
			<UppyImageUploader
				bind:value
				bind:altAttribute
				{label}
				class="inline-uploader"
				mode="button"
				onSuccess={() => {
					onSuccess();
					popover.close();
				}}
			/>
		</div>
	{/if}
{/if}

<style>
	img {
		width: 100%;
		height: auto;
		border-radius: 0.5rem;
	}

	.dropdown-panel {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		z-index: 100;
	}

	.dropdown-panel button {
		align-items: center;
		background: none;
		border: none;
		color: var(--color-gray-700);
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.dropdown-panel button:hover {
		background-color: var(--color-gray-050);
	}

	:global(.inline-uploader) {
		width: 100%;
	}
</style>
