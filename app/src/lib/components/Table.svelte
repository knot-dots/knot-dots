<script lang="ts">
	import { flip } from 'svelte/animate';
	import { autoSaveContainer } from '$lib/autoSaveContainer.svelte';
	import { type CategoryOptions, getCategoryKeys } from '$lib/categoryOptions';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import type { ActualDataContainer, Container } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		categoryOptions?: CategoryOptions;
		columns: Array<{ heading: string; key: string }>;
		rows: Container[];
		actualDataContainers?: ActualDataContainer[];
	}

	let { categoryOptions, columns, rows: originalRows, actualDataContainers = [] }: Props = $props();

	const initialCategory = $derived(
		Object.fromEntries(
			(categoryOptions ? getCategoryKeys(categoryOptions) : []).map((key) => [key, []])
		)
	);

	function ensureAllCategoriesArePresent(container: Container): Container {
		if ('category' in container.payload) {
			return {
				...container,
				payload: {
					...container.payload,
					category: { ...initialCategory, ...container.payload.category }
				}
			};
		} else {
			return container;
		}
	}

	let rows = $derived.by(() => {
		if (categoryOptions) {
			return originalRows
				.map(ensureAllCategoriesArePresent)
				.map((c) => autoSaveContainer(c, 2000, ''));
		} else {
			return originalRows.map((c) => autoSaveContainer(c, 2000, ''));
		}
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
				<div animate:flip={{ duration: 100 }} class="row">
					<EditableRow
						{categoryOptions}
						columns={columns.map(({ key }) => key)}
						bind:container={rows[i]}
						editable={$applicationState.containerDetailView.editable}
						{actualDataContainers}
					/>
				</div>
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
