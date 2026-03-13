<script lang="ts">
	import { flip } from 'svelte/animate';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import { getCategoryKeys } from '$lib/categoryOptions';
	import type { CategoryOptions } from '$lib/client/categoryOptions';
	import type { ActualDataContainer, Container } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		categoryOptions?: CategoryOptions | null;
		columns: Array<{ heading: string; key: string }>;
		rows: Container[];
		actualDataContainers?: ActualDataContainer[];
	}

	let {
		categoryOptions = null,
		columns,
		rows: originalRows,
		actualDataContainers = []
	}: Props = $props();

	const customCategoryKeys = $derived(categoryOptions ? getCategoryKeys(categoryOptions) : []);

	function initCategoryFields(snapshot: Container[]): Container[] {
		if (customCategoryKeys.length === 0) return snapshot;
		for (const row of snapshot) {
			const payload = row.payload;
			if (!('category' in payload)) {
				continue;
			}
			const cat = payload.category;
			for (const key of customCategoryKeys) {
				if (!Array.isArray(cat[key])) {
					cat[key] = [];
				}
			}
		}
		return snapshot;
	}

	// eslint-disable-next-line svelte/prefer-writable-derived
	let rows = $state([] as Container[]);

	$effect(() => {
		rows = initCategoryFields($state.snapshot(originalRows) as Container[]);
	});
</script>

<div class="table-wrapper">
	<div class="table">
		<div class="table-head">
			<div class="row">
				<div class="cell cell--action"></div>
				{#each columns as { heading, key } (key)}
					<div class="cell">{heading}</div>
				{/each}
			</div>
		</div>

		<div class="table-body">
			{#each rows as row, i (row.guid)}
				<form
					animate:flip={{ duration: 100 }}
					class="row"
					oninput={requestSubmit}
					onsubmit={autoSave(row, 2000)}
					novalidate
				>
					<EditableRow
						{categoryOptions}
						columns={columns.map(({ key }) => key)}
						bind:container={rows[i]}
						editable={$applicationState.containerDetailView.editable}
						{actualDataContainers}
					/>
				</form>
			{/each}
		</div>
	</div>
</div>

<style>
	.table-wrapper {
		height: calc(100% - 3rem);
		margin: 1.5rem 0 1.5rem 1.5rem;
		overflow: auto;
	}

	.table {
		position: relative;
		width: fit-content;
	}

	.table-head .cell {
		position: sticky;
		top: 0;
		white-space: nowrap;
		z-index: 1;
	}
</style>
