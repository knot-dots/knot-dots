<script lang="ts">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { type CategoryOptions, getCategoryKeys } from '$lib/categoryOptions';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import type { ActualDataContainer, AnyContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		categoryOptions?: CategoryOptions;
		columns: Array<{ heading: string; key: string }>;
		footer?: Snippet;
		rows: AnyContainer[];
		actualDataContainers?: ActualDataContainer[];
	}

	let {
		categoryOptions,
		columns,
		footer,
		rows: originalRows,
		actualDataContainers = []
	}: Props = $props();

	const initialCategory = $derived(
		Object.fromEntries(
			(categoryOptions ? getCategoryKeys(categoryOptions) : []).map((key) => [key, []])
		)
	);

	function ensureAllCategoriesArePresent(container: AnyContainer): AnyContainer {
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

	let rows = $state([] as AnyContainer[]);

	$effect(() => {
		if (categoryOptions) {
			rows = $state.snapshot(originalRows.map(ensureAllCategoriesArePresent));
		} else {
			rows = $state.snapshot(originalRows);
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
