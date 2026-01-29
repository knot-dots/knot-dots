<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import Check from '~icons/flowbite/check-circle-solid';
	import Plus from '~icons/knotdots/plus';
	import { env } from '$env/dynamic/public';
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
				goto(`/${page.data.currentOrganization.guid}/workspace/${container.guid}`);
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

<dialog bind:this={dialogRef} class="dialog dialog--narrow">
	<form method="dialog" class="dialog__body" on:submit|preventDefault={save}>
		<header class="dialog__header">
			<h2>
				{mode === 'create'
					? $_('workspace.save_as_page', { default: 'Als Arbeitsbereich speichern' })
					: $_('workspace.save_changes', { default: 'Änderungen speichern' })}
			</h2>
		</header>

		<label class="field">
			<span>{$_('workspace.title', { default: 'Titel' })}</span>
			<input bind:value={title} required />
		</label>

		<label class="field">
			<span>{$_('workspace.description', { default: 'Beschreibung für Karte' })}</span>
			<textarea bind:value={description} rows={3}></textarea>
		</label>

		<label class="field checkbox">
			<input bind:checked={favorite} type="checkbox" />
			<span>{$_('workspace.favorite', { default: 'Als Favorit markieren' })}</span>
		</label>

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
</dialog>

<style>
	dialog {
		max-width: 30rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 1rem;
	}

	.field.checkbox {
		align-items: center;
		flex-direction: row;
		gap: 0.5rem;
	}

	input,
	textarea {
		width: 100%;
	}

	.error {
		color: var(--color-red-700);
		margin-top: 0.75rem;
	}
</style>
