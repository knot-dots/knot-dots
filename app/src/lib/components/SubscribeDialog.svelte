<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Close from '~icons/knotdots/close';
	import type {
		AnyContainer,
		OrganizationalUnitContainer,
		OrganizationContainer
	} from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		dialog: HTMLDialogElement | undefined;
		onsubscribed?: () => void;
	}

	let { container, dialog = $bindable(), onsubscribed }: Props = $props();

	const organizations = $derived(page.data.organizations as OrganizationContainer[]);
	const organizationalUnits = $derived(
		page.data.organizationalUnits as OrganizationalUnitContainer[]
	);

	const isSysadmin = $derived($user.roles.includes('sysadmin'));

	const allowedOrgs = $derived.by(() => {
		const orgs = new Set([...$user.adminOf, ...$user.headOf]);
		if (isSysadmin && orgs.size === 0) {
			const currentOrg = page.data.currentOrganization;
			const currentOU = page.data.currentOrganizationalUnit;
			if (currentOU) orgs.add(currentOU.guid);
			else if (currentOrg) orgs.add(currentOrg.guid);
		}
		return orgs;
	});

	const selectableOrgs = $derived(
		[...organizations, ...organizationalUnits].filter(
			(org) =>
				allowedOrgs.has(org.guid) &&
				org.guid !== container.organization &&
				org.guid !== container.organizational_unit
		)
	);

	let selected: string[] = $state([]);

	function selectAll() {
		if (selected.length === selectableOrgs.length) {
			selected = [];
		} else {
			selected = selectableOrgs.map((o) => o.guid);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (selected.length === 0) {
			dialog?.close();
			return;
		}

		const response = await fetch(`/container/${container.guid}/subscription`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ organizations: selected })
		});

		if (response.ok) {
			onsubscribed?.();
			await invalidateAll();
			selected = [];
			dialog?.close();
		}
	}
</script>

<dialog bind:this={dialog}>
	<form method="dialog" onsubmit={handleSubmit}>
		<button
			class="action-button action-button--size-s"
			onclick={() => dialog?.close()}
			type="button"
		>
			<Close />
			<span class="is-visually-hidden">{$_('cancel')}</span>
		</button>

		<h2>{$_('subscribe_dialog.heading')}</h2>
		<p>{$_('subscribe_dialog.description')}</p>

		{#if selectableOrgs.length > 0}
			<label class="select-all">
				<input
					type="checkbox"
					checked={selected.length === selectableOrgs.length}
					onchange={selectAll}
				/>
				{$_('subscribe_dialog.select_all')}
			</label>

			<fieldset>
				{#each selectableOrgs as org (org.guid)}
					<label>
						<input type="checkbox" value={org.guid} bind:group={selected} />
						{org.payload.name}
					</label>
				{/each}
			</fieldset>
		{:else}
			<p class="empty">{$_('subscribe_dialog.no_organizations')}</p>
		{/if}

		<div class="button-row">
			<button class="button-primary button-xs" type="submit" disabled={selected.length === 0}>
				{$_('subscribe_dialog.confirm')}
			</button>
			<button class="button-alternative button-xs" type="button" onclick={() => dialog?.close()}>
				{$_('cancel')}
			</button>
		</div>
	</form>
</dialog>

<style>
	form {
		max-width: 30rem;
		padding: 3rem;
	}

	h2 {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 0.5rem;
	}

	p {
		color: var(--color-gray-500);
		margin: 0 0 1.5rem;
	}

	.action-button {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
	}

	fieldset {
		border: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0 0 1.5rem;
		max-height: 20rem;
		overflow-y: auto;
		padding: 0;
	}

	label {
		align-items: center;
		display: flex;
		gap: 0.5rem;
	}

	.select-all {
		border-bottom: 1px solid var(--color-gray-200);
		font-weight: 600;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
	}

	.button-row {
		display: flex;
		gap: 0.5rem;
	}

	.empty {
		font-style: italic;
	}
</style>
