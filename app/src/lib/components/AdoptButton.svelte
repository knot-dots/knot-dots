<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import BadgeCheck from '~icons/flowbite/badge-check-outline';
	import Bookmark from '~icons/flowbite/bookmark-outline';
	import MagnifyingGlass from '~icons/heroicons/magnifying-glass-16-solid';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		adoptableOrganizationalUnits,
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

	const adoptableUnits = $derived(
		adoptableOrganizationalUnits($user, container, page.data.organizationalUnits)
	);

	const mayAdopt = $derived(
		createFeatureDecisions(page.data.features).useAdoptions() &&
			isAdoptableProgram(container) &&
			adoptableUnits.length > 0
	);

	// Overrides the value derived from the container after a confirmed change,
	// because the container in the overlay is not refreshed by invalidateAll.
	let currentAdopters = $derived(adopters(container));

	const before = $derived(
		adoptableUnits.filter(({ guid }) => currentAdopters.includes(guid)).map(({ guid }) => guid)
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
			adoptableUnits.filter(({ payload }) =>
				payload.name.toLowerCase().includes(search.toLowerCase().trim())
			),
			page.data.organizations
		)
	);

	function selectAll() {
		selected = adoptableUnits.map(({ guid }) => guid);
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
	<div class="adopt" use:popperRef>
		<button class:button-primary={!isAdopted} type="button" use:popover.button>
			{#if isAdopted}
				<BadgeCheck />
				{$_('adopt.adopted')}
			{:else}
				<Bookmark />
				{$_('adopt.adopt')}
			{/if}
		</button>

		{#if $popover.expanded}
			<form
				aria-label={$_('adopt.popover.heading')}
				class="adopt-panel"
				onsubmit={handleSubmit}
				use:popperContent={extraOpts}
				use:popover.panel
			>
				<h3>{$_('adopt.popover.heading')}</h3>

				<label class="search">
					<MagnifyingGlass />
					<span class="is-visually-hidden">{$_('search')}</span>
					<input bind:value={search} placeholder={$_('search')} type="search" />
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

				<button class="button-primary button-xs" type="submit">
					{$_('adopt.popover.confirm')}
				</button>
			</form>
		{/if}
	</div>
{/if}

<style>
	.adopt {
		position: relative;
	}

	.adopt-panel {
		background-color: var(--color-gray-050);
		border: 1px solid white;
		border-radius: 16px;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.05),
			0 10px 15px -3px rgba(0, 0, 0, 0.1);
		padding: 0.5rem;
		width: 18rem;
		z-index: 1;
	}

	h3 {
		color: var(--color-gray-900);
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.5;
		margin: 0;
		padding: 0.25rem 0.5rem;
	}

	.search {
		align-items: center;
		background-color: var(--color-gray-100);
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		color: var(--color-gray-400);
		display: flex;
		font-size: 0.75rem;
		gap: 0.5rem;
		height: 1.75rem;
		margin: 0.25rem;
		padding: 0 0.5rem;
	}

	.search > :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.search input {
		background: none;
		border: none;
		flex: 1;
		font-size: inherit;
		min-width: 0;
		outline: none;
		padding: 0;
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
