<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { uploadAsFormData } from '$lib/client/upload';
	import {
		etag,
		modifiedContainer,
		newContainer,
		payloadTypes,
		predicates,
		visibility
	} from '$lib/models';
	import type {
		AnyContainer,
		Container,
		CustomEventMap,
		EmptyContainer,
		ModifiedContainer,
		NewContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: AnyContainer | EmptyContainer;

	$: mayDelete =
		'guid' in container &&
		container.relation.filter(
			({ predicate, object }) =>
				(predicate == predicates.enum['is-part-of'] ||
					predicate == predicates.enum['is-part-of-measure']) &&
				'revision' in container &&
				object == container.revision
		).length == 0;

	const dispatch =
		createEventDispatcher<Pick<CustomEventMap, 'submitSuccessful' | 'deleteSuccessful'>>();

	async function handleSubmit(event: SubmitEvent) {
		let url = '/container';
		let data: ModifiedContainer | NewContainer;

		const formData = new FormData(event.target as HTMLFormElement);

		const parseResult = z.union([modifiedContainer, newContainer]).safeParse({
			...container,
			realm: env.PUBLIC_KC_REALM,
			relation: container.relation
				.filter((r) => ('guid' in container ? r.subject == container.revision : true))
				.map(({ object, position, predicate }) => ({
					predicate,
					object,
					position
				}))
		});

		if (parseResult.success) {
			data = parseResult.data;
		} else {
			alert(parseResult.error);
			return;
		}

		await Promise.all(
			Array.from(formData)
				.filter(([, value]) => value instanceof File && value.size > 0)
				.map(async ([name, value]) => {
					try {
						const url = await uploadAsFormData(value as File);
						data.payload = { ...data.payload, [name]: url };
					} catch (e) {
						console.log(e);
					}
				})
		);

		if ('guid' in container) {
			url = `/container/${container.guid}/revision`;
		}

		const response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(data),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			dispatch('submitSuccessful', { event, result: (await response.json()) as Container });
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}

	async function handleDelete(event: Event) {
		if ('guid' in container) {
			const response = await fetch(`/container/${container.guid}`, {
				method: 'DELETE',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'If-Match': etag(container)
				}
			});
			if (response.ok) {
				dispatch('deleteSuccessful', { event });
			}
		}
	}
</script>

<form class="details" on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_(`${container.payload.type}`)}
			{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
				<input name="name" type="text" bind:value={container.payload.name} required />
			{:else}
				<input name="title" type="text" bind:value={container.payload.title} required />
			{/if}
		</label>
	</header>

	<slot name="data" />

	{#if container.payload.type !== payloadTypes.enum.organization && container.payload.type !== payloadTypes.enum.organizational_unit}
		{#if $ability.can('update', container.payload.type, 'organization')}
			<label>
				{$_('organization')}
				<select bind:value={container.organization}>
					{#each $page.data.organizations as organizationOption}
						<option value={organizationOption.guid}>
							{organizationOption.payload.name}
						</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if $ability.can('update', container.payload.type, 'organizational_unit')}
			<label>
				{$_('organizational_unit')}
				<select bind:value={container.organizational_unit}>
					{#each $page.data.organizationalUnits as organizationalUnitOption}
						{#if organizationalUnitOption.organization === container.organization}
							<option value={organizationalUnitOption.guid}>
								{organizationalUnitOption.payload.name}
							</option>
						{/if}
					{/each}
				</select>
			</label>
		{/if}
	{/if}
	<slot name="meta" />
	{#if $ability.can('update', container, 'visibility')}
		<fieldset>
			<legend>{$_('visibility.label')}</legend>
			{#each visibility.options as visibilityOption}
				<label>
					<input
						type="radio"
						name="visibility"
						value={visibilityOption}
						bind:group={container.payload.visibility}
					/>
					{$_(`visibility.${visibilityOption}`)}
				</label>
			{/each}
		</fieldset>
	{/if}

	<footer>
		<button class="primary" type="submit">{$_('save')}</button>
		<slot name="extra-buttons" />
		{#if mayDelete}
			<button class="delete quiet" title={$_('delete')} type="button" on:click={handleDelete}>
				<Icon src={Trash} size="20" />
			</button>
		{/if}
	</footer>
</form>

<style>
	footer {
		display: flex;
		gap: 0.5rem;
	}

	.delete {
		color: var(--color-red-500);
		margin-left: auto;
	}
</style>
