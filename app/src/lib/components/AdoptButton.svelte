<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import CheckCircle from '~icons/flowbite/check-circle-solid';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import Adopt from '~icons/knotdots/adopt';
	import Search from '~icons/knotdots/search';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		organizationalUnitsManagedByUser,
		adopters,
		adoptionDiff,
		adoptionRelations,
		groupedByOrganization,
		isAdoptableProgram
	} from '$lib/adoptions';
	import { createFeatureDecisions } from '$lib/features';
	import type { Container, ProgramPayload } from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		container: Container<ProgramPayload>;
	}

	let { container }: Props = $props();

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'top',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	const potentialAdopters = $derived(
		organizationalUnitsManagedByUser($user, container, page.data.organizationalUnits)
	);

	const mayAdopt = $derived(
		createFeatureDecisions(page.data.features).useAdoptions() &&
			isAdoptableProgram(container) &&
			potentialAdopters.length > 0
	);

	// Overrides the value derived from the container after a confirmed change,
	// because the container in the overlay is not refreshed by invalidateAll.
	let currentAdopters = $derived(adopters(container));

	const before = $derived(
		potentialAdopters.filter(({ guid }) => currentAdopters.includes(guid)).map(({ guid }) => guid)
	);

	const isAdopted = $derived(before.length > 0);

	let search = $state('');

	let selected = $state<string[]>([]);

	$effect(() => {
		if ($popover.expanded) {
			search = '';
			selected = [...before];
		}
	});

	const groups = $derived(
		groupedByOrganization(
			potentialAdopters.filter(({ payload }) =>
				payload.name.toLowerCase().includes(search.toLowerCase().trim())
			),
			page.data.organizations
		)
	);

	function selectAll() {
		selected = potentialAdopters.map(({ guid }) => guid);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		const { added, removed } = adoptionDiff(before, selected);

		const relations = [
			...adoptionRelations(container.guid, added, false),
			...adoptionRelations(container.guid, removed, true)
		];

		const response = await fetch(`/container/${container.guid}/relation`, {
			body: JSON.stringify(relations),
			headers: { 'Content-Type': 'application/json' },
			method: 'POST'
		});

		if (response.ok) {
			currentAdopters = [...currentAdopters.filter((guid) => !removed.includes(guid)), ...added];
			popover.close();
			await invalidateAll();
		}
	}
</script>

{#if mayAdopt}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button system-primary" type="button" use:popover.button>
			{#if isAdopted}
				<CheckCircle />
				{$_('adopt.adopted')}
			{:else}
				<Adopt />
				{$_('adopt.adopt')}
			{/if}

			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $popover.expanded}
			<form
				aria-label={$_('adopt.popover.heading')}
				class="dropdown-panel"
				onsubmit={handleSubmit}
				use:popperContent={extraOpts}
				use:popover.panel
			>
				<h3>{$_('adopt.popover.heading')}</h3>

				<label class="search focus-indicator">
					<Search />
					<span class="is-visually-hidden">{$_('search')}</span>
					<input type="search" placeholder={$_('search')} bind:value={search} />
				</label>

				<p class="selection-summary">
					<button class="quiet" onclick={() => (selected = [])} type="button">
						{$_('selection_counter', { values: { count: selected.length } })}
					</button>
					<button class="quiet" onclick={selectAll} type="button">{$_('select_all')}</button>
				</p>

				<div class="groups">
					{#each groups as group (group.organization.guid)}
						{#if groups.length > 1}
							<h4>{group.organization.payload.name}</h4>
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

				<button class="button-primary button-xs system-primary" type="submit">
					{$_('adopt.popover.confirm')}
				</button>
			</form>
		{/if}
	</div>
{/if}

<style>
	.dropdown-button {
		--dropdown-button-default-background: var(--color-surface-accent-default);
		--dropdown-button-default-color: var(--color-accent-on-default);
		--dropdown-button-icon-default-color: var(--color-accent-on-default);
	}

	.dropdown-panel {
		border: solid 1px var(--color-border-raised);
		border-radius: 16px;
		background-color: var(--color-surface-container);
		min-width: 16.125rem;
	}

	h3 {
		color: var(--color-text-strong);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0;
		padding: 0.25rem 0.5rem;
	}

	.search {
		align-items: center;
		background-color: var(--color-background-accent-muted);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 6px;
		display: flex;
		margin: 0.25rem;
		padding-left: 0.25rem;
	}

	.search > :global(svg) {
		color: var(--color-icon-accent-subtle);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.search input {
		background-color: transparent;
		border: none;
		display: inline-block;
		flex-grow: 0;
		font-size: 0.75rem;
		min-height: 1.75rem;
		padding: 0 0.5rem;
	}

	.search input:focus {
		outline: none;
	}

	.selection-summary {
		align-items: center;
		display: flex;
		justify-content: space-between;
		margin: 0;
	}

	.selection-summary button {
		border: none;
		color: var(--color-gray-600);
		font-size: 0.75rem;
		font-weight: 500;
		height: 1.75rem;
		padding: 0 0.75rem;
	}

	.groups {
		max-height: 16rem;
		overflow-y: auto;
	}

	.groups h4 {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0.25rem 0 0;
		padding: 0.25rem 0.5rem;
	}

	.groups ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.groups label {
		align-items: center;
		color: var(--color-gray-600);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		padding: 0.5rem;
	}

	.button-primary[type='submit'] {
		display: block;
		font-size: 0.75rem;
		margin-top: 0.5rem;
		min-height: 1.75rem;
		width: 100%;
	}
</style>
