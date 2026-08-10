<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MagnifyingGlass from '~icons/heroicons/magnifying-glass-16-solid';
	import Close from '~icons/knotdots/close';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		adoptableOrganizationalUnits,
		adopters,
		adoptionDiff,
		adoptionRelations,
		groupedByOrganization
	} from '$lib/adoptions';
	import type { Container, ProgramPayload } from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		container: Container<ProgramPayload>;
		dialog: HTMLDialogElement;
	}

	let { container, dialog = $bindable() }: Props = $props();

	const adoptableUnits = $derived(
		adoptableOrganizationalUnits($user, container, page.data.organizationalUnits)
	);

	const before = $derived.by(() => {
		const currentAdopters = adopters(container);
		return adoptableUnits
			.filter(({ guid }) => currentAdopters.includes(guid))
			.map(({ guid }) => guid);
	});

	let search = $state('');

	let selected = $derived([...before]);

	const groups = $derived(
		groupedByOrganization(
			adoptableUnits.filter(({ payload }) =>
				payload.name.toLowerCase().includes(search.toLowerCase().trim())
			),
			page.data.organizations
		)
	);

	function reset() {
		search = '';
		selected = [...before];
	}

	function selectAll() {
		selected = adoptableUnits.map(({ guid }) => guid);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const { added, removed } = adoptionDiff(before, selected);

		const responses = await Promise.all([
			...(added.length > 0
				? [
						fetch(`/container/${container.guid}/relation`, {
							body: JSON.stringify(adoptionRelations(container.guid, added)),
							headers: { 'Content-Type': 'application/json' },
							method: 'POST'
						})
					]
				: []),
			...(removed.length > 0
				? [
						fetch(`/container/${container.guid}/relation`, {
							body: JSON.stringify(adoptionRelations(container.guid, removed)),
							headers: { 'Content-Type': 'application/json' },
							method: 'DELETE'
						})
					]
				: [])
		]);

		if (responses.every(({ ok }) => ok)) {
			dialog.close();
			await invalidateAll();
		}
	}
</script>

<dialog bind:this={dialog} onclose={reset}>
	<form onsubmit={handleSubmit}>
		<button
			class="action-button action-button--size-s"
			onclick={() => dialog.close()}
			type="button"
		>
			<Close />
			<span class="is-visually-hidden">{$_('cancel')}</span>
		</button>

		<h2>{$_('adopt.dialog.heading')}</h2>

		<label class="search">
			<MagnifyingGlass />
			<span class="is-visually-hidden">{$_('search')}</span>
			<input bind:value={search} placeholder={$_('search')} type="search" />
		</label>

		<p class="selection-summary">
			<span>{$_('selection_counter', { values: { count: selected.length } })}</span>
			<button class="quiet" onclick={selectAll} type="button">{$_('select_all')}</button>
		</p>

		<div class="groups">
			{#each groups as group (group.organization.guid)}
				{#if groups.length > 1}
					<h3>{group.organization.payload.name}</h3>
				{/if}
				<ul>
					{#each group.units as unit (unit.guid)}
						<li>
							<label>
								<input bind:group={selected} type="checkbox" value={unit.guid} />
								<span class="truncated">{unit.payload.name}</span>
							</label>
						</li>
					{/each}
				</ul>
			{/each}
		</div>

		<button class="button-primary button-xs" type="submit">
			{$_('adopt.dialog.confirm')}
		</button>
	</form>
</dialog>

<style>
	form {
		max-width: 30rem;
		padding: 1.5rem;
		width: 22rem;
	}

	h2 {
		color: var(--color-gray-700);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 1rem;
		padding-right: 2rem;
	}

	.action-button {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
	}

	.search {
		align-items: center;
		background-color: var(--color-gray-050);
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		color: var(--color-gray-400);
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.375rem 0.75rem;
	}

	.search input {
		background: none;
		border: none;
		flex: 1;
		outline: none;
		padding: 0;
	}

	.selection-summary {
		align-items: center;
		color: var(--color-gray-500);
		display: flex;
		font-size: 0.875rem;
		justify-content: space-between;
		margin: 0 0 0.5rem;
	}

	.selection-summary button {
		border: none;
		padding: 0;
	}

	.groups {
		margin-bottom: 1.5rem;
		max-height: 18rem;
		overflow-y: auto;
	}

	.groups h3 {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0.75rem 0 0.25rem;
	}

	.groups ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.groups label {
		align-items: center;
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.button-primary {
		display: block;
		width: 100%;
	}
</style>
