<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import tooltip from '$lib/attachments/tooltip';
	import UppyImageUploader from '$lib/components/UppyImageUploader.svelte';
	import requestSubmit from '$lib/client/requestSubmit';
	import transformFileURL from '$lib/transformFileURL.js';

	interface Props {
		editable?: boolean;
		label: string;
		help?: string;
		value: string | undefined;
		allowedFileTypes?: string[];
	}

	let {
		editable = false,
		label,
		help,
		value = $bindable(),
		allowedFileTypes
	}: Props = $props();

	let uploadInProgress = $state(false);
	const id = crypto.randomUUID();

	function stopPropagation(fn: (event: Event) => void) {
		return (event: Event) => {
			event.stopPropagation();
			fn(event);
		};
	}

	function remove(event: Event) {
		value = undefined;
		requestSubmit(event);
	}
</script>

{#if editable}
	<label class="label" for={id}>{label}</label>
	<div>
		<span class="value value--is-editable">
			{#if uploadInProgress}
				<span class="loader"></span>
			{:else if value}
				<img alt={$_('image')} src={transformFileURL(value)} />
				<button
					class="button button-remove"
					onclick={stopPropagation(remove)}
					{@attach tooltip($_('upload.image.remove'))}
					type="button"><TrashBin /></button
				>
			{:else}
				{$_('empty')}
			{/if}
		</span>

		<UppyImageUploader
			bind:value
			{label}
			{id}
			{allowedFileTypes}
			mode="input"
			onSuccess={() => {
				const form = document.querySelector(`[for="${id}"]`)?.parentElement?.closest('form');
				if (form) {
					form.requestSubmit();
				}
			}}
		/>

		<p class="help">{help ?? $_('upload.image.help')}</p>
	</div>
{:else}
	<span class="label">{label}</span>
	<div>
		<span class="value">
			{#if value}
				<img alt={$_('image')} src={transformFileURL(value)} />
			{:else}
				{$_('empty')}
			{/if}
		</span>

		<p class="help">{help ?? $_('upload.image.help')}</p>
	</div>
{/if}

<style>
	div {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	img {
		height: 1.5rem;
	}

	label {
		flex-shrink: 0;
	}

	.button-remove {
		--button-active-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0.375rem;
		--padding-y: 0.375rem;

		border: none;
	}

	.button-remove > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.help {
		flex-basis: 100%;
		font-size: 0.75rem;
		font-weight: 400;
		margin-top: 0;
	}

	.value {
		align-items: center;
		background-color: var(--form-control-background);
		border-radius: 4px;
		display: flex;
		flex-grow: 1;
		gap: 0.5rem;
		justify-content: space-between;
		min-height: 2.25rem;
		padding: 0.375rem 0.5rem;
	}

	.value.value--is-editable:hover {
		background-color: var(--color-gray-100);
	}

	.loader {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-bottom-color: transparent;
		border-radius: 50%;
		display: inline-block;
		animation: rotation 1s linear infinite;
	}

	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
