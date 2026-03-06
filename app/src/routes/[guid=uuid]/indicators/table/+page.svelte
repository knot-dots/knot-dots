<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { downloadCsv, generateIndicatorCsv } from '$lib/client/csvDownload';
	import Dialog from '$lib/components/Dialog.svelte';
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
	let uploading: boolean = $state(false);

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
		uploadDialog.showModal();
	}

	async function handleUpload(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		uploading = true;
		uploadErrors = [];
		uploadSuccess = false;

		try {
			const response = await fetch(`${page.url.pathname}/upload`, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (result.success) {
				uploadSuccess = true;
				await invalidateAll();
			} else if (result.errors) {
				uploadErrors = result.errors;
			}
		} catch {
			uploadErrors = [$_('indicator_csv.error.upload_failed')];
		} finally {
			uploading = false;
		}
	}
</script>

<IndicatorsPage {data}>
	{#snippet actions()}
		<button class="button-outline csv-action" type="button" onclick={handleDownload}>
			{$_('indicator_csv.download')}
		</button>
		<button class="button-outline csv-action" type="button" onclick={openUploadDialog}>
			{$_('indicator_csv.upload')}
		</button>
	{/snippet}
	<Table {columns} rows={filteredRows} />
	<Help slug="indicators-table" />
</IndicatorsPage>

<Dialog bind:dialog={uploadDialog}>
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

	<form class="upload-form" onsubmit={handleUpload}>
		<h2>{$_('indicator_csv.upload')}</h2>
		<p>{$_('indicator_csv.upload_description')}</p>
		<label>
			{$_('import.csv_file')}
			<input accept="text/csv" name="csv" type="file" required />
		</label>
		<footer>
			<button class="button-primary" type="submit" disabled={uploading}>
				{$_('import.submit')}
			</button>
		</footer>
	</form>
</Dialog>

<style>
	.csv-action {
		--padding-x: 11px;
		--padding-y: 5px;

		font-size: 0.875rem;
	}

	.success-message {
		color: var(--color-green-600, #16a34a);
		margin-bottom: 1rem;
	}

	.error-list {
		color: var(--color-red-600, #dc2626);
		margin-bottom: 1rem;
	}

	.upload-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	footer {
		display: flex;
		gap: 0.5rem;
	}
</style>
