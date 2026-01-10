<script lang="ts">
	import Uppy from '@uppy/core';
	import German from '@uppy/locales/lib/de_DE';
	import ImageEditor from '@uppy/image-editor';
	import requestSubmit from '$lib/client/requestSubmit';
	import XHRUpload from '@uppy/xhr-upload';
	import { onDestroy } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { openDashboard, closeDashboard } from '$lib/uppyStore';
	import UploadIcon from '~icons/flowbite/upload-outline';
	import TrashBin from '~icons/flowbite/trash-bin-outline';
	import PlaceholderImage from '~icons/knotdots/placeholder-image';
	import requestSubmitElement from '$lib/client/requestSubmitElement';

	interface Props {
		value: string | undefined;
		label?: string;
		allowedFileTypes?: string[];
		aspectRatio?: number;
		onSuccess?: (url: string) => void;
		mode?: 'button' | 'placeholder' | 'input';
		class?: string;
		id?: string;
	}

	let {
		value = $bindable(),
		label = '',
		allowedFileTypes = ['image/png', 'image/jpeg', 'image/svg+xml'],
		aspectRatio = 1,
		onSuccess,
		mode = 'button',
		class: className = '',
		id: providedId = ''
	}: Props = $props();

	const id = providedId || crypto.randomUUID();
	let uploadInProgress = $state(false);

	const uppy = new Uppy({
		allowMultipleUploadBatches: false,
		autoProceed: false,
		locale: {
			...German,
			strings: {
				...German.strings,
				uploadXFiles: {
					'0': 'Datei hochladen',
					'1': 'Datei hochladen',
					'2': 'Dateien hochladen'
				},
				uploadXNewFiles: {
					'0': 'Datei hochladen',
					'1': 'Datei hochladen',
					'2': 'Dateien hochladen'
				},
				uploadSelectedFiles: 'Datei hochladen'
			}
		},
		restrictions: {
			allowedFileTypes: allowedFileTypes,
			maxNumberOfFiles: 1
		}
	})
		.use(ImageEditor, {
			cropperOptions: {
				viewMode: 1,
				background: false,
				responsive: true,
				initialAspectRatio: aspectRatio
			}
		})
		.use(XHRUpload, {
			endpoint: '/upload',
			fieldName: 'upload',
			formData: true,
			responseType: 'json'
		});

	uppy.on('file-added', () => {
		openDashboard(uppy, {
			doneButtonHandler: () => {
				uppy.upload();
			},
			onRequestCloseModal: () => {
				uppy.clear();
			}
		});
	});

	uppy.on('cancel-all', () => {
		closeDashboard();
	});

	uppy.on('upload', () => {
		uploadInProgress = true;
	});

	uppy.on('upload-success', (file, response) => {
		if (response.body && (response.body as any).url) {
			const url = (response.body as any).url;
			value = url;
			const input = document.getElementById(id);
			if (input) requestSubmitElement(input);

			if (onSuccess) onSuccess(url);
		}
		uploadInProgress = false;
		closeDashboard();
		uppy.clear();
	});

	uppy.on('upload-error', (file, error) => {
		console.error('Upload error:', error);
		uploadInProgress = false;
	});

	function handleFileSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files && input.files[0]) {
			uppy.addFile({
				name: input.files[0].name,
				type: input.files[0].type,
				data: input.files[0],
				source: 'Local'
			});
			input.value = '';
		}
	}

	function triggerOpen() {
		const input = document.getElementById(id) as HTMLInputElement;
		input?.click();
	}

	function removeImage(event: Event) {
		value = undefined;
		uppy.clear();
		requestSubmit(event);
	}

	onDestroy(() => {
		uppy.destroy();
	});
</script>

<input
	accept={allowedFileTypes.join(',')}
	class="is-visually-hidden"
	{id}
	onchange={handleFileSelect}
	type="file"
/>

{#if mode === 'button'}
	{#if value}
		<button class={className} onclick={removeImage} type="button">
			<TrashBin />
			{$_('upload.image.remove')}
		</button>
	{:else}
		<button class={className || 'button button-upload'} onclick={triggerOpen} type="button">
			{#if uploadInProgress}
				<span class="loader"></span>
			{:else}
				<PlaceholderImage />
				{label || $_('upload.image.choose')}
			{/if}
		</button>
	{/if}
{:else if mode === 'placeholder'}
	<div class="placeholder {className}" onclick={triggerOpen}>
		{#if uploadInProgress}
			<span class="loader"></span>
		{:else}
			<div class="placeholder-content">
				<PlaceholderImage />
				<span>{label || $_('upload.image.choose')}</span>
			</div>
		{/if}
	</div>
{:else if mode === 'input'}
	<label class="button button-upload" onclick={triggerOpen}>
		<UploadIcon />
		{$_('upload.image.choose')}
	</label>
{/if}

<style>
	.button-upload {
		--button-border-color: var(--color-primary-700);
		--button-hover-background: var(--color-primary-700);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		border-radius: 4px;
		color: var(--color-primary-700);
		font-size: 0.75rem;
	}

	.button-upload > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.button-upload:hover {
		color: white;
	}

	.placeholder {
		padding: 1rem;
		background-color: var(--color-gray-050);
		border-radius: 0.5rem;
		border: 1px dashed var(--color-gray-300);
		color: var(--color-gray-600);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		transition: all 0.2s;
	}

	.placeholder:hover {
		background-color: var(--color-gray-100);
		border-color: var(--color-primary-400);
	}

	.placeholder-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
