<script lang="ts">
	import type { UppyContext } from '@uppy/components';
	import { useDropzone } from '@uppy/svelte';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Upload from '~icons/flowbite/upload-solid';

	const { getRootProps, getInputProps } = useDropzone({});

	const { progress, status } = getContext<UppyContext>('uppy-context');
</script>

<div {...getRootProps()} oninput={(e) => e.stopPropagation()}>
	<input {...getInputProps()} class="is-visually-hidden" />
	<Upload />
	<p>
		{@html $_('upload.drop_here', {
			values: { or_browse: `<br><span class="link">${$_('upload.or_browse')}</span>` }
		})}
	</p>
</div>

<p class="help">{$_('upload.file.help')}</p>

{#if status === 'uploading'}
	<progress value={progress} max="100"></progress>
{/if}

<style>
	div {
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

	div > p {
		max-width: 12rem;
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
