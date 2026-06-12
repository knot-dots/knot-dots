<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Close from '~icons/knotdots/close';
	import Search from '~icons/knotdots/search';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import type {
		AnyContainer,
		OrganizationalUnitContainer,
		OrganizationContainer,
		Relation
	} from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		open: boolean;
		anchor?: HTMLElement;
		onsubscribed?: () => void;
		onclose?: () => void;
	}

	let { container, open = $bindable(), anchor, onsubscribed, onclose }: Props = $props();

	let popoverEl = $state<HTMLDivElement>();
	let initialSelected: string[] = $state([]);

	$effect(() => {
		if (open && anchor && popoverEl) {
			const rect = anchor.getBoundingClientRect();
			const popoverWidth = popoverEl.offsetWidth;
			const buttonCenter = rect.left + rect.width / 2;
			popoverEl.style.left = `${buttonCenter - popoverWidth / 2}px`;
			popoverEl.style.bottom = `${window.innerHeight - rect.top + 4}px`;
		}
	});

	$effect(() => {
		if (open) {
			const relations = ((container.relation ?? []) as Relation[]).filter(
				(r) => r.object === container.guid && r.predicate === 'is-subscribed-to'
			);
			const subscribedGuids = relations
				.map((r) => r.subject)
				.filter((guid) => allowedOrganizationalUnitGuids.has(guid));
			initialSelected = subscribedGuids;
			selected = [...subscribedGuids];
		}
	});

	const organizations = $derived(page.data.organizations as OrganizationContainer[]);
	const organizationalUnits = $derived(
		page.data.organizationalUnits as OrganizationalUnitContainer[]
	);

	const allowedOrganizationalUnitGuids = $derived.by(() => {
		const organizationalUnitGuids = new Set<string>();
		if ($user.roles.includes('sysadmin')) {
			for (const organizationalUnit of organizationalUnits) {
				organizationalUnitGuids.add(organizationalUnit.guid);
			}
		} else {
			for (const organizationalUnit of organizationalUnits) {
				if (
					$user.adminOf.includes(organizationalUnit.guid) ||
					$user.headOf.includes(organizationalUnit.guid)
				) {
					organizationalUnitGuids.add(organizationalUnit.guid);
				}
			}
		}
		return organizationalUnitGuids;
	});

	interface OrgGroup {
		org: OrganizationContainer;
		units: OrganizationalUnitContainer[];
	}

	const orgGroups = $derived.by(() => {
		const groups: OrgGroup[] = [];
		for (const org of organizations) {
			const units = organizationalUnits.filter(
				(organizationalUnit) =>
					organizationalUnit.organization === org.guid &&
					allowedOrganizationalUnitGuids.has(organizationalUnit.guid)
			);
			if (units.length > 0) {
				groups.push({ org, units });
			}
		}
		return groups;
	});

	const allSelectableOrganizationalUnits = $derived(orgGroups.flatMap((g) => g.units));

	let expanded = $state(new Set<string>());
	let selected: string[] = $state([]);
	let searchTerm = $state('');

	$effect(() => {
		if (open && orgGroups.length === 1) {
			expanded = new Set([orgGroups[0].org.guid]);
		}
	});

	const filteredGroups = $derived.by(() => {
		if (!searchTerm) return orgGroups;
		const lower = searchTerm.toLowerCase();
		return orgGroups
			.map((group) => ({
				...group,
				units: group.units.filter((organizationalUnit) =>
					organizationalUnit.payload.name.toLowerCase().includes(lower)
				)
			}))
			.filter((group) => group.units.length > 0);
	});

	function toggleGroup(orgGuid: string) {
		const next = new Set(expanded);
		if (next.has(orgGuid)) {
			next.delete(orgGuid);
		} else {
			next.add(orgGuid);
		}
		expanded = next;
	}

	function selectAll() {
		if (selected.length === allSelectableOrganizationalUnits.length) {
			selected = [];
		} else {
			selected = allSelectableOrganizationalUnits.map(
				(organizationalUnit) => organizationalUnit.guid
			);
		}
	}

	function clearSelection() {
		selected = [];
	}

	function close() {
		open = false;
		searchTerm = '';
		expanded = new Set();
		onclose?.();
	}

	async function handleConfirm() {
		const added = selected.filter((guid) => !initialSelected.includes(guid));
		const removed = initialSelected.filter((guid) => !selected.includes(guid));

		if (added.length === 0 && removed.length === 0) {
			close();
			return;
		}

		const promises: Promise<Response>[] = [];

		if (added.length > 0) {
			const relations = added.map((orgGuid) => ({
				object: container.guid,
				position: 0,
				predicate: 'is-subscribed-to',
				subject: orgGuid
			}));
			promises.push(
				fetch(`/container/${container.guid}/relation`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(relations)
				})
			);
		}

		if (removed.length > 0) {
			const relations = removed.map((orgGuid) => ({
				object: container.guid,
				position: 0,
				predicate: 'is-subscribed-to',
				subject: orgGuid
			}));
			promises.push(
				fetch(`/container/${container.guid}/relation`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(relations)
				})
			);
		}

		await Promise.all(promises);

		const otherRelations = ((container.relation ?? []) as Relation[]).filter(
			(r) => !(r.object === container.guid && r.predicate === 'is-subscribed-to')
		);
		const nextSubscriptionRelations = selected.map((subject, index) => ({
			object: container.guid,
			position: index,
			predicate: 'is-subscribed-to' as const,
			subject
		}));
		container.relation = [...otherRelations, ...nextSubscriptionRelations];
		initialSelected = [...selected];

		onsubscribed?.();
		await invalidateAll();
		selected = [];
		close();
	}
</script>

{#if open}
	<div class="popover" bind:this={popoverEl}>
		<div class="popover-header">
			<span class="popover-title">{$_('subscribe_dialog.heading')}</span>
			<button class="popover-close" type="button" onclick={close}>
				<Close />
			</button>
		</div>

		<div class="popover-search">
			<Search />
			<input type="text" placeholder={$_('search')} bind:value={searchTerm} />
		</div>

		<div class="popover-actions">
			{#if selected.length > 0}
				<button class="action-link" type="button" onclick={clearSelection}>
					{$_('subscribe_dialog.selected', { values: { count: selected.length } })}
				</button>
			{/if}
			<button
				class="action-link"
				class:disabled={selected.length === allSelectableOrganizationalUnits.length}
				type="button"
				onclick={selectAll}
			>
				{$_('subscribe_dialog.select_all')}
			</button>
		</div>

		<div class="popover-list">
			{#each filteredGroups as group (group.org.guid)}
				<button class="group-header" type="button" onclick={() => toggleGroup(group.org.guid)}>
					<span class="group-chevron">
						{#if expanded.has(group.org.guid)}
							<ChevronDown />
						{:else}
							<ChevronRight />
						{/if}
					</span>
					<span class="group-name">{group.org.payload.name}</span>
				</button>
				{#if expanded.has(group.org.guid)}
					{#each group.units as organizationalUnit (organizationalUnit.guid)}
						<label class="popover-item">
							<input type="checkbox" value={organizationalUnit.guid} bind:group={selected} />
							<span class="item-label">{organizationalUnit.payload.name}</span>
						</label>
					{/each}
				{/if}
			{:else}
				<p class="empty">{$_('subscribe_dialog.no_organizations')}</p>
			{/each}
		</div>

		<div class="popover-footer">
			<button
				class="confirm-button"
				type="button"
				disabled={selected.length === initialSelected.length &&
					selected.every((g) => initialSelected.includes(g))}
				onclick={handleConfirm}
			>
				{$_('subscribe_dialog.confirm')}
			</button>
		</div>
	</div>
{/if}

<style>
	.popover {
		background: var(--color-gray-050, #f9f9fa);
		border: 1px solid white;
		border-radius: 16px;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px 0 rgba(0, 0, 0, 0.05);
		display: flex;
		flex-direction: column;
		overflow: clip;
		padding: 8px;
		position: fixed;
		width: 280px;
		z-index: 1000;
	}

	.popover-header {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0 8px;
	}

	.popover-title {
		color: var(--color-gray-900, #0f1726);
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.popover-close {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		height: 32px;
		justify-content: center;
		padding: 8px;
		width: 32px;
	}

	.popover-close:hover {
		background: var(--color-gray-100);
	}

	.popover-close :global(svg) {
		height: 16px;
		width: 16px;
	}

	.popover-search {
		align-items: center;
		background: var(--color-gray-100, #f3f4f5);
		border: 1px solid var(--color-gray-200, #eeeff1);
		border-radius: 8px;
		display: flex;
		gap: 8px;
		height: 28px;
		margin: 2px 4px 4px;
		padding: 0 8px;
	}

	.popover-search :global(svg) {
		color: var(--color-gray-500);
		flex-shrink: 0;
		height: 16px;
		width: 16px;
	}

	.popover-search input {
		background: none;
		border: none;
		color: var(--color-gray-900);
		flex: 1;
		font-size: 0.75rem;
		outline: none;
	}

	.popover-search input::placeholder {
		color: var(--color-gray-400);
	}

	.popover-actions {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0;
	}

	.action-link {
		background: none;
		border: none;
		border-radius: 9999px;
		color: var(--color-primary-700, #1a56db);
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 500;
		height: 28px;
		padding: 0 12px;
	}

	.action-link:hover {
		background: var(--color-primary-100);
	}

	.action-link.disabled {
		color: var(--color-gray-300);
		cursor: default;
		pointer-events: none;
	}

	.popover-list {
		display: flex;
		flex-direction: column;
		max-height: 280px;
		min-width: 192px;
		overflow-y: auto;
	}

	.group-header {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-shrink: 0;
		gap: 4px;
		min-height: 36px;
		padding: 8px;
	}

	.group-header:hover {
		background: var(--color-gray-100);
	}

	.group-chevron {
		align-items: center;
		display: flex;
		flex-shrink: 0;
		height: 16px;
		width: 16px;
	}

	.group-chevron :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.group-name {
		color: var(--color-gray-900, #0f1726);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.popover-item {
		align-items: center;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-shrink: 0;
		gap: 8px;
		min-height: 40px;
		min-width: 192px;
		padding: 8px 8px 8px 28px;
	}

	.popover-item:hover {
		background: var(--color-gray-100);
	}

	.popover-item input[type='checkbox'] {
		accent-color: var(--color-primary-700);
		border-radius: 4px;
		flex-shrink: 0;
		height: 16px;
		width: 16px;
	}

	.item-label {
		color: var(--color-gray-600, #44546e);
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 14px;
	}

	.popover-footer {
		border-top: 1px solid white;
		margin: 0 -8px -8px;
		padding: 8px;
	}

	.confirm-button {
		background: var(--color-primary-700, #1a56db);
		border: none;
		border-radius: 8px;
		color: white;
		cursor: pointer;
		display: flex;
		font-size: 0.75rem;
		font-weight: 500;
		justify-content: center;
		padding: 8px 12px;
		text-align: center;
		width: 100%;
	}

	.confirm-button:hover {
		background: var(--color-primary-800);
	}

	.confirm-button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.empty {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-style: italic;
		padding: 12px 8px;
	}
</style>
