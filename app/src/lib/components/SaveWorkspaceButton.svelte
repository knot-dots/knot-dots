<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import Check from '~icons/flowbite/check-circle-solid';
	import Plus from '~icons/knotdots/plus';
	import { env } from '$env/dynamic/public';
	import Dialog from '$lib/components/Dialog.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import {
		containerOfType,
		etag,
		payloadTypes,
		type PayloadType,
		type WorkspaceContainer
	} from '$lib/models';
	import type { WorkspaceFilters } from '$lib/workspaceFilters';
	import { filtersFromUrl } from '$lib/workspaceFilters';

	type Mode = 'create' | 'update';

	export let mode: Mode = 'create';
	export let workspace: WorkspaceContainer | undefined = undefined;
	export let defaultPayloadType: PayloadType[] = [];

	let title = workspace?.payload.title ?? '';
	let description = workspace?.payload.description ?? '';
	let favorite = workspace?.payload.favorite ?? false;
	let saving = false;
	let errorMessage = '';
	let dialogRef: HTMLDialogElement;

	function currentFilters(): WorkspaceFilters {
		if (mode === 'update' && workspace) {
			const filters = workspace.payload.filters as WorkspaceFilters;
			if (filters.payloadType.length === 0 && defaultPayloadType.length > 0) {
				return { ...filters, payloadType: defaultPayloadType };
			}
			return filters;
		}

		const fromUrl = filtersFromUrl(new URL(page.url));
		if (fromUrl.payloadType.length === 0 && defaultPayloadType.length > 0) {
			return { ...fromUrl, payloadType: defaultPayloadType };
		}

		return fromUrl;
	}

	async function save() {
		saving = true;
		errorMessage = '';
		try {
			if (mode === 'create') {
				const base = containerOfType(
					payloadTypes.enum.workspace,
					page.data.currentOrganization.guid,
					page.data.currentOrganizationalUnit?.guid ?? null,
					page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
					env.PUBLIC_KC_REALM as string
				);

				const created = await fetch('/container', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						...base,
						payload: {
							...base.payload,
							title,
							description,
							favorite,
							filters: currentFilters()
						}
					})
				});

				if (!created.ok) {
					throw new Error(await created.text());
				}

				const container = (await created.json()) as WorkspaceContainer;
				dialogRef.close();
			} else if (workspace) {
				const updatedPayload = {
					...workspace.payload,
					title,
					description,
					favorite,
					filters: currentFilters()
				};

				const res = await fetch(`/container/${workspace.guid}/revision`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'If-Match': etag(workspace)
					},
					body: JSON.stringify({
						...workspace,
						payload: updatedPayload
					})
				});

				if (!res.ok) {
					throw new Error(await res.text());
				}

				dialogRef.close();
			}
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : `${e}`;
		} finally {
			saving = false;
		}
	}
</script>

<button class="button button-primary button-xs" on:click={() => dialogRef.showModal()} type="button">
	{#if mode === 'create'}
		<Plus /> {$_('workspace.save_as_page', { default: 'Als Arbeitsbereich speichern' })}
	{:else}
		<Check /> {$_('workspace.save_changes', { default: 'Änderungen speichern' })}
	{/if}
</button>

<Dialog bind:dialog={dialogRef}>
	<form method="dialog" class="workspace-dialog" on:submit|preventDefault={save}>
		<h2>
			{mode === 'create'
				? $_('workspace.save_as_page', { default: 'Als Arbeitsbereich speichern' })
				: $_('workspace.save_changes', { default: 'Änderungen speichern' })}
		</h2>

		<label class="field" for="workspace-title">
			<span>{$_('workspace.title', { default: 'Titel' })}</span>
			<input id="workspace-title" bind:value={title} required />
		</label>

		<EditableFormattedText
			editable
			label={$_('workspace.description', { default: 'Beschreibung' })}
			bind:value={description}
		/>
		
		{#if errorMessage}
			<p class="error">{errorMessage}</p>
		{/if}

		<footer class="dialog__footer">
			<button class="button button-outline" type="button" on:click={() => dialogRef.close()}>
				{$_('cancel', { default: 'Abbrechen' })}
			</button>
			<button class="button button-primary" disabled={saving} type="submit">
				{saving ? $_('saving', { default: 'Speichern…' }) : $_('save', { default: 'Speichern' })}
			</button>
		</footer>
	</form>
</Dialog>

<style>
	.workspace-dialog {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.workspace-dialog h2 {
		color: var(--color-gray-900);
		font-size: 1.25rem;
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	input {
		border: 1px solid var(--color-gray-200);
		border-radius: 6px;
		color: var(--color-gray-700);
		padding: 0.5rem 0.625rem;
		width: 100%;
	}


	.dialog__footer {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}

	.workspace-dialog :global(.details-section) {
		padding: 0;
	}

	.error {
		color: var(--color-red-700);
		margin-top: 0.75rem;
	}
</style>
