<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import prettierBytes from '@transloadit/prettier-bytes';
	import Uppy from '@uppy/core';
	import XHRUpload from '@uppy/xhr-upload';
	import { UppyContextProvider } from '@uppy/svelte';
	import DownloadIcon from '~icons/flowbite/download-outline';
	import UploadIcon from '~icons/flowbite/upload-outline';
	import FileIcon from '~icons/flowbite/file-solid';
	import Close from '~icons/knotdots/close';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { downloadCsv, generateIndicatorCsv } from '$lib/client/csvDownload';
	import Dialog from '$lib/components/Dialog.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import Help from '$lib/components/Help.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import {
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		type IndicatorContainer
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let uploadDialog: HTMLDialogElement = $state()!;
	let uploadErrors: string[] = $state([]);
	let uploadSuccess: boolean = $state(false);
	let uploadFiles: { id: string; name: string; size: number }[] = $state([]);
	let uppy: Uppy | undefined = $state();

	let filteredRows = $derived(
		data.containers.filter((c) =>
			data.useNewIndicators ? isIndicatorTemplateContainer(c) : isIndicatorContainer(c)
		)
	);

	let allYears = $derived.by(() => {
		const yearSet = new Set<number>();
		for (const c of filteredRows) {
			if ('historicalValues' in c.payload) {
				for (const [year] of (c as IndicatorContainer).payload.historicalValues) {
					yearSet.add(year);
				}
			}
		}
		return [...yearSet].sort((a, b) => a - b);
	});

	let yearColumns = $derived(
		allYears.map((year) => ({ heading: String(year), key: `year:${year}` }))
	);

	let columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('indicator_category'), key: 'indicatorCategory' },
		{ heading: $_('indicator_type'), key: 'indicatorType' },
		{ heading: $_('topic'), key: 'topic' },
		{ heading: $_('category'), key: 'sdg' },
		{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
		{ heading: $_('audience'), key: 'audience' },
		{ heading: $_('editorial_state'), key: 'editorialState' },
		{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
		{ heading: $_('label.unit'), key: 'unit' },
		...yearColumns
	]);

	function handleDownload() {
		const orgUnits = new Map<string, string>(
			(page.data.organizationalUnits ?? []).map(
				(ou: { guid: string; payload: { name: string } }) => [ou.guid, ou.payload.name]
			)
		);
		const csv = generateIndicatorCsv(filteredRows, allYears, orgUnits);
		downloadCsv(csv, 'indicators.csv');
	}

	function openUploadDialog() {
		uploadErrors = [];
		uploadSuccess = false;
		uploadFiles = [];
		uppy?.cancelAll();
		uploadDialog.showModal();
	}

	function syncUploadFiles() {
		uploadFiles =
			uppy?.getFiles().map((file) => ({
				id: file.id,
				name: file.name,
				size: file.size ?? 0
			})) ?? [];
	}

	function removeUploadFile(id: string) {
		uppy?.removeFile(id);
		syncUploadFiles();
	}

	onMount(() => {
		const instance = new Uppy({
			autoProceed: true,
			restrictions: {
				allowedFileTypes: ['text/csv'],
				maxNumberOfFiles: 1,
				maxTotalFileSize: 100 * 1024 * 1024
			}
		}).use(XHRUpload, {
			endpoint: `${page.url.pathname}/upload`,
			fieldName: 'csv',
			formData: true,
			responseType: 'json'
		});

		instance.on('file-added', () => {
			uploadErrors = [];
			uploadSuccess = false;
			syncUploadFiles();
		});

		instance.on('file-removed', () => {
			syncUploadFiles();
		});

		instance.on('upload-success', (file, response) => {
			const body = response?.body as { success?: boolean; errors?: string[] } | undefined;
			if (body?.success) {
				uploadSuccess = true;
				uploadErrors = [];
				void invalidateAll();
			} else if (body?.errors) {
				uploadErrors = body.errors;
			}
		});

		instance.on('upload-error', (file, error, response) => {
			const body = response?.body as { errors?: string[] } | undefined;
			if (body?.errors) {
				uploadErrors = body.errors;
			} else {
				uploadErrors = [$_('indicator_csv.error.upload_failed')];
			}
		});

		uppy = instance;

		return () => {
			instance.destroy();
		};
	});
</script>

<IndicatorsPage {data}>
	{#snippet actions()}
		<button class="button csv-action csv-action--primary" type="button" onclick={openUploadDialog}>
			<UploadIcon />
			{$_('indicator_csv.upload')}
		</button>
		<button class="button csv-action csv-action--outline" type="button" onclick={handleDownload}>
			<DownloadIcon />
			{$_('indicator_csv.download')}
		</button>
	{/snippet}
	<Table {columns} rows={filteredRows} />
	<Help slug="indicators-table" />
</IndicatorsPage>

<Dialog bind:dialog={uploadDialog} class="csv-upload-dialog" showCloseButton={false}>
	<div class="csv-upload">
		<header class="csv-upload__header">
			<span class="csv-upload__label">{$_('indicator_csv.upload')}</span>
			<button
				class="button-outline csv-upload__cancel"
				type="button"
				onclick={() => uploadDialog.close()}
			>
				{$_('cancel')}
			</button>
		</header>
		<div class="csv-upload__content">
			{#if uploadSuccess}
				<p class="success-message">{$_('indicator_csv.upload_success')}</p>
			{/if}

			{#if uploadErrors.length > 0}
				<ul class="error-list">
					{#each uploadErrors as err (err)}
						<li>{err}</li>
					{/each}
				</ul>
			{/if}

			<div class="csv-upload__card">
				{#if uppy}
					<UppyContextProvider {uppy}>
						<FileUpload helpKey="upload.csv.help" />
					</UppyContextProvider>
				{/if}

				{#if uploadFiles.length > 0}
					<ul class="csv-upload__file-list">
						{#each uploadFiles as file (file.id)}
							<li class="csv-upload__file">
								<FileIcon />
								<div class="csv-upload__file-info">
									<span class="csv-upload__file-name">{file.name}</span>
									<span class="csv-upload__file-size">
										{prettierBytes(file.size || 0)}
									</span>
								</div>
								<button
									class="button csv-upload__file-remove"
									type="button"
									onclick={() => removeUploadFile(file.id)}
									aria-label={$_('upload.file.remove')}
								>
									<Close />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
</Dialog>

<style>
	.csv-action {
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		align-items: center;
		border-radius: 8px;
		box-sizing: border-box;
		display: inline-flex;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1.5;
		height: 2.125rem;
		min-height: 2.125rem;
		padding: 0 var(--padding-x);
	}

	.csv-action > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}

	.csv-action--outline {
		--button-border-color: var(--color-gray-200);
		--button-hover-background: var(--color-gray-050);
		background: var(--color-white, #fff);
		border: 1px solid var(--color-gray-200);
		color: var(--color-gray-900);
	}

	.csv-action--primary {
		--button-border-color: transparent;
		--button-hover-background: var(--color-primary-700);
		background: var(--color-primary-700);
		border: 1px solid transparent;
		color: var(--color-white, #fff);
	}

	.success-message {
		color: var(--color-green-600, #16a34a);
		margin-bottom: 1rem;
	}

	.error-list {
		color: var(--color-red-600, #dc2626);
		margin-bottom: 1rem;
	}

	:global(dialog.csv-upload-dialog) {
		max-width: 53.5rem;
		padding: 0;
	}

	.csv-upload {
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	.csv-upload__header {
		align-items: center;
		background: var(--color-white, #fff);
		border-bottom: 1px solid var(--color-gray-200);
		display: flex;
		justify-content: space-between;
		padding: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.csv-upload__label {
		color: var(--color-gray-500);
		font-size: 1rem;
	}

	.csv-upload__cancel {
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;
		font-size: 0.75rem;
	}

	.csv-upload__content {
		padding: 1.5rem 5rem 5rem;
	}

	.csv-upload__card {
		background: var(--color-white, #fff);
		border-radius: 24px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
	}

	.csv-upload__file-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.csv-upload__file {
		align-items: center;
		border-radius: 8px;
		display: flex;
		gap: 0.75rem;
		padding: 0.25rem;
	}

	.csv-upload__file-info {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.125rem;
	}

	.csv-upload__file-name {
		color: var(--color-gray-900);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.csv-upload__file-size {
		color: var(--color-gray-500);
		font-size: 0.75rem;
	}

	.csv-upload__file-remove {
		--padding-x: 0.375rem;
		--padding-y: 0.375rem;
		border: none;
		color: var(--color-gray-500);
	}

	.csv-upload__file-remove > :global(svg) {
		height: 0.75rem;
		width: 0.75rem;
	}
</style>
