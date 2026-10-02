<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import CheckCircle from '~icons/flowbite/check-circle-solid';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import Adopt from '~icons/knotdots/adopt';
	import Close from '~icons/knotdots/close';
	import Search from '~icons/knotdots/search';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		adopters,
		adoptionDiff,
		adoptionRelations,
		groupedByOrganization,
		isAdoptableProgram,
		organizationalUnitsManagedByUser,
		organizationsManagedByUser
	} from '$lib/adoptions';
	import MultipleChoiceTree, {
		type MultipleChoiceTreeOption
	} from '$lib/components/MultipleChoiceTree.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import type { Container, ProgramPayload } from '$lib/models';

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

	const adoptableOrganizations = $derived(
		organizationsManagedByUser(container, page.data.organizations)
	);

	const adoptableUnits = $derived(
		organizationalUnitsManagedByUser(container, page.data.organizationalUnits)
	);

	const adoptableGuids = $derived(
		[...adoptableOrganizations, ...adoptableUnits].map(({ guid }) => guid)
	);

	const mayAdopt = $derived(
		createFeatureDecisions(page.data.features).useAdoptions() &&
			isAdoptableProgram(container) &&
			adoptableGuids.length > 0
	);

	// Overrides the value derived from the container after a confirmed change,
	// because the container in the overlay is not refreshed by invalidateAll.
	let currentAdopters = $derived(adopters(container));

	const before = $derived(adoptableGuids.filter((guid) => currentAdopters.includes(guid)));

	const isAdopted = $derived(before.length > 0);

	let search = $state('');

	let selected = $state<string[]>([]);

	$effect(() => {
		if ($popover.expanded) {
			search = '';
			selected = [...before];
		}
	});

	function matchesSearch({ payload }: { payload: { name: string } }) {
		return payload.name.toLowerCase().includes(search.toLowerCase().trim());
	}

	// A search keeps the groups whose organization or units match it.
	const options: MultipleChoiceTreeOption[] = $derived(
		groupedByOrganization(
			adoptableUnits.filter(matchesSearch),
			page.data.organizations,
			adoptableOrganizations
		)
			.filter(({ organization, units }) => units.length > 0 || matchesSearch(organization))
			.map(({ organization, adoptable, units }) => ({
				disabled: !adoptable,
				label: organization.payload.name,
				subOptions: units.map(({ guid, payload }) => ({ label: payload.name, value: guid })),
				value: organization.guid
			}))
	);

	const allSelected = $derived(adoptableGuids.every((guid) => selected.includes(guid)));

	function selectAll() {
		selected = [...adoptableGuids];
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
				<p class="dropdown-panel-title">
					<span>{$_('adopt.popover.heading')}</span>
					<button class="action-button" onclick={popover.close} type="button">
						<Close />
						<span class="is-visually-hidden">{$_('close')}</span>
					</button>
				</p>

				<label class="search focus-indicator">
					<Search />
					<span class="is-visually-hidden">{$_('search')}</span>
					<input type="search" placeholder={$_('search')} bind:value={search} />
				</label>

				<p class="selection-actions">
					<button class="pill-button" onclick={() => (selected = [])} type="button">
						{$_('selection_counter', { values: { count: selected.length } })}
					</button>
					<button class="nav-button" disabled={allSelected} onclick={selectAll} type="button">
						{$_('select_all')}
					</button>
				</p>

				<MultipleChoiceTree {options} bind:selected expandAll={search.trim() !== ''} />

				<footer>
					<button class="button-primary button-xs system-primary" type="submit">
						{$_('adopt.popover.confirm')}
					</button>
				</footer>
			</form>
		{/if}
	</div>
{/if}

<style>
	.dropdown {
		--dropdown-button-default-background: var(--color-surface-accent-default);
		--dropdown-button-default-color: var(--color-accent-on-default);
		--dropdown-button-icon-default-color: var(--color-accent-on-default);
		--dropdown-panel-background: var(--color-surface-container);
		--dropdown-panel-border-color: var(--color-border-raised);
		--dropdown-panel-border-radius: 16px;
		--dropdown-panel-gap: 0;
		--dropdown-panel-max-height: 30rem;
		--dropdown-panel-width: 20rem;
	}

	.dropdown-panel-title {
		align-items: center;
		background-color: var(--color-surface-container);
		color: var(--color-text-strong);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0;
		position: sticky;
		top: -0.5rem;
		z-index: 1;
	}

	.dropdown-panel-title > span {
		margin-right: auto;
		padding-left: 0.5rem;
	}

	.search {
		align-items: center;
		background-color: var(--color-background-accent-muted);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 8px;
		display: flex;
		gap: 0.5rem;
		margin: 0.25rem;
		padding: 0 0.5rem;
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
		flex-grow: 1;
		font-size: 0.75rem;
		min-height: 1.75rem;
		min-width: 0;
		padding: 0;
	}

	.search input::placeholder {
		color: var(--color-text-muted);
	}

	.search input:focus {
		outline: none;
	}

	.selection-actions {
		align-items: center;
		background-color: var(--color-surface-container);
		display: flex;
		justify-content: space-between;
		margin: 0;
		position: sticky;
		top: 1.5rem;
		z-index: 1;
	}

	.pill-button,
	.nav-button {
		background: none;
		border: none;
		color: var(--color-text-accent-default);
		font-size: 0.75rem;
		font-weight: 500;
		height: 1.75rem;
	}

	.pill-button {
		border-radius: 9999px;
		padding: 0 0.75rem;
	}

	.nav-button {
		border-radius: 8px;
		padding: 0 0.5rem;
	}

	.nav-button:disabled {
		background: none;
		color: var(--color-text-disabled);
	}

	footer {
		background-color: var(--color-surface-accent-container-raised);
		border-radius: 0 0 16px 16px;
		border-top: 1px solid var(--color-border-raised);
		bottom: -0.5rem;
		margin: 0.5rem -0.5rem -0.5rem;
		padding: 0.5rem;
		position: sticky;
		z-index: 1;
	}

	footer > button {
		display: block;
		font-size: 0.75rem;
		min-height: 1.75rem;
		width: 100%;
	}
</style>
