<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { type AnyContainer, type ExpensesContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ExpensesContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	function addEntry() {
		const year = new Date().getFullYear();
		container.payload.entries = [...container.payload.entries, { year, amount: 0 }];
	}

	function removeEntry(index: number) {
		container.payload.entries = container.payload.entries.filter((_, i) => i !== index);
	}
</script>

<header>
	<h2 class="details-heading">{container.payload.title}</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $ability.can('update', container)}
				<li>
					<button
						aria-label={$_('add_item')}
						class="action-button action-button--size-l"
						onclick={addEntry}
						type="button"
					>
						<Plus />
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<table class="expenses-table">
	<thead>
		<tr>
			<th scope="col">{$_('indicator.table.year')}</th>
			<th scope="col">{$_('amount')}</th>
			{#if editable && $ability.can('update', container)}
				<th scope="col" class="actions-cell"></th>
			{/if}
		</tr>
	</thead>
	<tbody>
		{#if container.payload.entries.length === 0}
			<tr>
				<td colspan={editable && $ability.can('update', container) ? 3 : 2}>
					<span class="empty">{$_('empty')}</span>
				</td>
			</tr>
		{:else}
			{#each container.payload.entries as entry, index}
				<tr>
					{#if editable && $ability.can('update', container)}
						<td>
							<input bind:value={entry.year} min="0" step="1" type="number" />
						</td>
						<td>
							<input bind:value={entry.amount} step="0.01" type="number" />
						</td>
						<td class="actions-cell">
							<button
								aria-label={$_('delete')}
								class="link-button"
								onclick={() => removeEntry(index)}
								type="button"
							>
								{$_('delete')}
							</button>
						</td>
					{:else}
						<td>{entry.year}</td>
						<td>{entry.amount}</td>
					{/if}
				</tr>
			{/each}
		{/if}
	</tbody>
</table>

<style>
	.expenses-table {
		border-collapse: collapse;
		margin-top: 0.5rem;
		width: 100%;
	}

	.expenses-table th,
	.expenses-table td {
		padding: 0.25rem 0.5rem;
		text-align: left;
	}

	.expenses-table thead {
		border-bottom: 1px solid var(--color-gray-200);
	}

	.expenses-table input[type='number'] {
		box-sizing: border-box;
		width: 100%;
	}

	.actions-cell {
		text-align: right;
		width: 0;
		white-space: nowrap;
	}

	.empty {
		color: var(--color-gray-500);
	}
</style>
