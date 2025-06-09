<script lang="ts">
	import { flip } from 'svelte/animate';
	import EditableRow from '$lib/components/EditableRow.svelte';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import type { Container } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		columns: Array<{ heading: string; key: string }>;
		rows: Container[];
	}

	let { columns, rows }: Props = $props();
</script>

<div class="table-wrapper">
	<div class="table">
		<div class="table-head">
			<div class="row">
				{#each columns as { heading, key } (key)}
					<div class="cell">{heading}</div>
				{/each}
			</div>
		</div>

		<div class="table-body">
			{#each rows as row (row.guid)}
				<form
					animate:flip={{ duration: 100 }}
					class="row"
					oninput={requestSubmit}
					onsubmit={autoSave(row, 2000)}
					novalidate
				>
					<EditableRow
						columns={columns.map(({ key }) => key)}
						container={row}
						editable={$applicationState.containerDetailView.editable}
					/>
				</form>
			{/each}
		</div>
	</div>
</div>

<style>
	.table-wrapper {
		height: 100%;
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
	}
</style>
