<script lang="ts">
	import prettierBytes from '@transloadit/prettier-bytes';
	import Uppy from '@uppy/core';
	import German from '@uppy/locales/lib/de_DE';
	import { UppyContextProvider } from '@uppy/svelte';
	import XHRUpload from '@uppy/xhr-upload';
	import { _, locale } from 'svelte-i18n';
	import File from '~icons/flowbite/file-solid';
	import FileDoc from '~icons/flowbite/file-doc-solid';
	import FilePDF from '~icons/flowbite/file-pdf-solid';
	import Close from '~icons/knotdots/close';
	import { invalidateAll } from '$app/navigation';
	import requestSubmit from '$lib/client/requestSubmit';
	import saveContainer from '$lib/client/saveContainer';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import type { AnyContainer, FileCollectionContainer } from '$lib/models';
	import transformFileURL from '$lib/transformFileURL';
	import { ability } from '$lib/stores';

	interface Props {
		container: FileCollectionContainer;
		relatedContainers: AnyContainer[];
		editable?: boolean;
	}

	let {
		container = $bindable(),
		relatedContainers = $bindable(),
		editable = false
	}: Props = $props();

	let uppy = new Uppy({
		autoProceed: true,
		locale: $locale?.startsWith('de') ? German : undefined,
		restrictions: {
			allowedFileTypes: [
				'application/pdf',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			],
			maxTotalFileSize: 100000000
		}
	}).use(XHRUpload, {
		bundle: false,
		endpoint: '/upload',
		fieldName: 'upload',
		responseType: 'json'
	});

	uppy.on('upload-success', async (file, response) => {
		if (file && response.uploadURL) {
			container.payload.file.push({
				name: file.name ?? response.uploadURL,
				size: file.size ?? 0,
				type: file.type,
				url: response.uploadURL
			});
		} else {
			console.error('upload failed', response);
		}
	});

	uppy.on('complete', async () => {
		const res = await saveContainer(container);
		if (res.ok) {
			const updatedContainer = await res.json();
			container.revision = updatedContainer.revision;
			await invalidateAll();
		} else {
			const error = await res.json();
			alert(error.message);
		}
	});

	function remove(index: number) {
		return (event: Event) => {
			container.payload.file = [
				...container.payload.file.slice(0, index),
				...container.payload.file.slice(index + 1)
			];
			requestSubmit(event);
		};
	}
</script>

<header>
	<h2 class="details-heading">{$_('files')}</h2>
	{#if editable}
		<ul class="inline-actions">
			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#if editable && $ability.can('update', container)}
	<UppyContextProvider {uppy}>
		<FileUpload />
	</UppyContextProvider>
{/if}

<ul class="file-list">
	{#each container.payload.file as { name, size, type, url }, i (url)}
		<li>
			{#if type === 'application/pdf'}
				<FilePDF />
			{:else if type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
				<FileDoc />
			{:else}
				<File />
			{/if}

			<span>
				<a
					class="file-name truncated"
					href={transformFileURL(url)}
					rel={type === 'application/pdf' ? 'noopener noreferrer' : undefined}
					target={type === 'application/pdf' ? '_blank' : undefined}>{name}</a
				>
				{#if size}
					<span class="file-size">{prettierBytes(size)}</span>
				{/if}
			</span>

			{#if editable && $ability.can('update', container)}
				<button class="action-button action-button--size-l" onclick={remove(i)} type="button">
					<Close />
				</button>
			{/if}
		</li>
	{/each}
</ul>

<style>
	header {
		margin-bottom: 1rem;
	}

	.file-list {
		margin-top: 1rem;
	}

	.file-list > li {
		align-items: center;
		border-radius: 8px;
		display: flex;
		gap: 0.75rem;
		padding: 0.25rem;
	}

	.file-list > li:nth-child(n + 2) {
		margin-top: 0.5rem;
	}

	.file-list > li:hover {
		background-color: var(--color-gray-100);
	}

	.file-list > li > span {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.file-list > li :global(svg) {
		flex-shrink: 0;
		max-width: none;
	}

	.file-list > li :global(> svg:first-child) {
		color: var(--color-gray-400);
	}

	.file-name {
		color: var(--color-gray-900);
	}

	.action-button {
		color: var(--color-gray-700);
	}
</style>
