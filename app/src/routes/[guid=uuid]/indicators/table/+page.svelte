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
	import { getCategoryKeys } from '$lib/categoryOptions';
	import { getToastContext } from '$lib/contexts/toast';
	import { downloadCsv, generateIndicatorCsv } from '$lib/client/csvDownload';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import Help from '$lib/components/Help.svelte';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		isActualDataContainer,
		isIndicatorTemplateContainer,
		containerOfType,
		payloadTypes,
		isBinaryIndicatorContainer
	} from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { ability, lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	let toast = getToastContext();

	let canUploadCsv = $derived(
		$ability.can(
			'create',
			containerOfType(
				payloadTypes.enum.indicator_template,
				page.data.currentOrganization.guid,
				page.data.currentOrganizationalUnit?.guid ?? null,
				page.data.currentOrganization.guid,
				''
			)
		)
	);

	let canDownloadCsv = $derived(
		$ability.can(
			'download-csv',
			containerOfType(
				payloadTypes.enum.indicator_template,
				page.data.currentOrganization.guid,
				page.data.currentOrganizationalUnit?.guid ?? null,
				page.data.currentOrganization.guid,
				''
			)
		)
	);

	// svelte-ignore non_reactive_update
	let uploadDialog: HTMLDialogElement;
	let uploadErrors: string[] = $state([]);
	let uploadFiles: { id: string; name: string; size: number }[] = $state([]);
	let uppy: Uppy | undefined = $state();

	let actualDataContainers = $derived(containers.filter(isActualDataContainer));

	let rows = $derived(
		containers.filter((c) => isIndicatorTemplateContainer(c) || isBinaryIndicatorContainer(c))
	);

	let allYears = $derived(
		Array.from(
			new Set(actualDataContainers.flatMap(({ payload }) => payload.values.map(([year]) => year)))
		).toSorted()
	);

	let yearColumns = $derived(
		allYears.map((year) => ({ heading: String(year), key: `year:${year}` }))
	);

	const customCategoryColumns = $derived(
		data.categoryOptions
			? getCategoryKeys(data.categoryOptions).map((key) => ({
					heading: data.categoryOptions?.__categoryLabels__?.[key] ?? key,
					key
				}))
			: []
	);

	const columns = $derived([
		{ heading: $_('title'), key: 'title' },
		{ heading: $_('description'), key: 'description' },
		{ heading: $_('visibility.label'), key: 'visibility' },
		{ heading: $_('indicator_category'), key: 'indicatorCategory' },
		{ heading: $_('indicator_type'), key: 'indicatorType' },
		...customCategoryColumns,
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
		const csv = generateIndicatorCsv(rows, allYears, orgUnits, actualDataContainers);
		downloadCsv(csv, 'indicators.csv');
	}

	function openUploadDialog() {
		uploadErrors = [];
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
		if (!createFeatureDecisions(page.data.features).useImportFromCsv()) {
			return;
		}
		const instance = new Uppy({
			autoProceed: true,
			restrictions: {
				allowedFileTypes: ['text/csv', '.csv'],
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
			syncUploadFiles();
		});

		instance.on('file-removed', () => {
			syncUploadFiles();
		});

		instance.on('upload-success', (file, response) => {
			const body = response?.body as { success?: boolean; errors?: string[] } | undefined;
			if (body?.success) {
				uploadErrors = [];
				uploadDialog.close();
				toast({
					status: 'success',
					heading: $_('indicator_csv.upload'),
					message: $_('indicator_csv.upload_success')
				});
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

<IndicatorsPage data={{ ...data, containers }}>
	{#snippet actions()}
		{#if canUploadCsv}
			<button class="button-primary button-xs" type="button" onclick={openUploadDialog}>
				<UploadIcon />
				{$_('indicator_csv.upload')}
			</button>
		{/if}
		{#if canDownloadCsv}
			<button class="button-xs" type="button" onclick={handleDownload}>
				<DownloadIcon />
				{$_('indicator_csv.download')}
			</button>
		{/if}
	{/snippet}
	<Table {actualDataContainers} categoryOptions={data.categoryOptions} {columns} {rows} />
	<Help slug="indicators-table" />
</IndicatorsPage>

{#if createFeatureDecisions(page.data.features).useImportFromCsv()}
	<dialog bind:this={uploadDialog} class="csv-upload">
		<form method="dialog">
			<p class="dialog-actions">
				<span>{$_('indicator_csv.upload')}</span>
				<button class="button-xs button-alternative" type="submit">
					{$_('cancel')}
				</button>
			</p>

			<div class="details">
				{#if uploadErrors.length > 0}
					<ul class="error-list">
						{#each uploadErrors as err (err)}
							<li>{err}</li>
						{/each}
					</ul>
				{/if}

				{#if uppy}
					<UppyContextProvider {uppy}>
						<FileUpload helpKey="upload.csv.help" />
					</UppyContextProvider>
				{/if}

				{#if uploadFiles.length > 0}
					<ul class="file-list">
						{#each uploadFiles as file (file.id)}
							<li>
								<FileIcon />
								<span>
									<span class="file-name truncated">{file.name}</span>
									<span class="file-size">{prettierBytes(file.size)}</span>
								</span>
								<button
									aria-label={$_('upload.file.remove')}
									class="action-button action-button--size-l"
									type="button"
									onclick={() => removeUploadFile(file.id)}
								>
									<Close />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</form>
	</dialog>
{/if}

<style>
	.csv-upload {
		max-height: 90vh;
		width: calc(min(54rem, 100vw));
	}

	.csv-upload > * {
		min-width: 30rem;
	}

	.dialog-actions {
		align-items: center;
		background-color: white;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 1.5rem;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.dialog-actions span {
		color: var(--color-gray-500);
	}

	.error-list {
		color: var(--color-red-600);
		margin-bottom: 1rem;
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
</style>
