<script lang="ts">
	import type { UppyContext } from '@uppy/components';
	import { useDropzone } from '@uppy/svelte';
	import { getContext } from 'svelte';
	import Upload from '~icons/flowbite/upload-solid';

	const { getRootProps, getInputProps } = useDropzone({});

	const { progress, status } = getContext<UppyContext>('uppy-context');
</script>

<div {...getRootProps()} oninput={(e) => e.stopPropagation()}>
	<input {...getInputProps()} class="is-visually-hidden" />
	<Upload />
	<p>Drag and drop files here</p>
</div>

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
		height: 10rem;
		justify-content: center;
		position: relative;
		width: 100%;
	}

	progress {
		margin-top: 1.5rem;
		width: 100%;
	}
</style>
