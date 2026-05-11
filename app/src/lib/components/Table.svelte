<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { page } from '$app/state';
	import autoSave from '$lib/client/autoSave';
	import { filterCategoryContext } from '$lib/categoryOptions';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import type { ActualDataContainer, AnyContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		columns: Array<{ heading: string; key: string }>;
		footer?: Snippet;
		rows: AnyContainer[];
		actualDataContainers?: ActualDataContainer[];
	}

	let { columns, footer, rows: originalRows, actualDataContainers = [] }: Props = $props();

	function ensureAllCategoriesArePresent(container: AnyContainer): AnyContainer {
		if ('category' in container.payload) {
			const initialCategory = Object.fromEntries(
				filterCategoryContext(page.data.categoryContext, [container.payload.type]).keys.map(
					(key) => [key, []]
				)
			);
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

	let rows = $derived(
		originalRows.map((row) => {
			let _ = $state(ensureAllCategoriesArePresent(row));
			return _;
		})
	);
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
						columns={columns.map(({ key }) => key)}
						bind:container={rows[i]}
						editable={$applicationState.containerDetailView.editable}
						{actualDataContainers}
					/>
				</form>
			{/each}
		</div>
	</div>
	{#if footer}
		{@render footer()}
	{/if}
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
