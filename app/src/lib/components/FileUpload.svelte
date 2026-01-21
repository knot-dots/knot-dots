<script lang="ts">
	import type { UppyContext } from '@uppy/components';
	import { useDropzone } from '@uppy/svelte';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Upload from '~icons/flowbite/upload-solid';

	const { getRootProps, getInputProps } = useDropzone({
		onDragOver: () => (dropZoneIsActive = true),
		onDragLeave: () => (dropZoneIsActive = false),
		onDrop: () => (dropZoneIsActive = false)
	});

	const { progress, status, uppy } = $derived(getContext<UppyContext>('uppy-context'));

	let dropZoneIsActive = $state(false);

	let errorMessage = $state('');

	// svelte-ignore state_referenced_locally
	uppy?.on('restriction-failed', (file, error) => {
		errorMessage = error.message;
		setTimeout(() => {
			errorMessage = '';
		}, 3000);
	});

	// svelte-ignore state_referenced_locally
	uppy?.on('upload-error', (file, error) => {
		errorMessage = error.message;
		setTimeout(() => {
			errorMessage = '';
		}, 3000);
	});
</script>

<div
	class="drop-zone"
	class:drop-zone--is-dragged-over={dropZoneIsActive}
	class:drop-zone--is-uploading={status === 'uploading'}
	class:drop-zone--has-error={errorMessage}
	{...getRootProps()}
	oninput={(e) => e.stopPropagation()}
>
	<input {...getInputProps()} class="is-visually-hidden" />
	<Upload />
	<p>
		{#if status === 'uploading'}
			{$_('upload.uploading')}
		{:else if errorMessage}
			{errorMessage}
		{:else}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html $_('upload.drop_here', {
				values: { or_browse: `<br><span class="link">${$_('upload.or_browse')}</span>` }
			})}
		{/if}
	</p>
</div>

<p class="help">{$_('upload.file.help')}</p>

{#if status === 'uploading'}
	<progress value={progress} max="100"></progress>
{/if}

<style>
	.drop-zone {
		align-items: center;
		background: var(--color-gray-050);
		border-radius: 8px;
		border: 2px dashed var(--color-gray-200);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: 10rem;
		justify-content: center;
		position: relative;
		text-align: center;
		width: 100%;
	}

	.drop-zone.drop-zone--has-error {
		background: var(--color-red-050);
		border: 2px dashed var(--color-red-600);
		color: var(--color-red-700);
	}

	.drop-zone.drop-zone--is-dragged-over {
		background: var(--color-gray-100);
		border: 2px dashed var(--color-primary-600);
	}

	.drop-zone.drop-zone--is-uploading {
		background: var(--color-primary-050);
		border: 2px dashed var(--color-primary-600);
		color: var(--color-primary-700);
	}

	.drop-zone > p {
		max-width: 12rem;
	}

	.drop-zone > :global(svg) {
		color: var(--color-gray-500);
	}

	:global(.link) {
		color: var(--color-primary-600);
		cursor: pointer;
		text-decoration: underline;
	}

	progress {
		margin-top: 1rem;
		width: 100%;
	}

	.help {
		margin-top: 0.625rem;
	}
</style>
