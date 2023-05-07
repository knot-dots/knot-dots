<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { applyAction, deserialize } from '$app/forms';
	import { page } from '$app/stores';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { containerTypes, sustainableDevelopmentGoals } from '$lib/models';
	import type { ContainerType } from '$lib/models';
	import type { Relation } from '$lib/server/db';
	import type { PageData } from './$types';

	export let data: PageData;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	const containerType = $page.params.type as ContainerType;

	const { isPartOfOptions } = data;

	const selected: Relation[] = [];

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => reason);
		const response = await fetch((event.target as HTMLFormElement).action, {
			method: 'POST',
			body: data,
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined)
			}
		});

		const result: ActionResult = deserialize(await response.text());
		await applyAction(result);
	}
</script>

<form class="details" method="POST" on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_('title')}
			<input name="title" type="text" required />
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				<textarea name="summary" maxlength="200" required />
			</label>
			<label>
				{$_('description')}
				<textarea name="description" required />
			</label>
		</div>
		<div class="details-content-column">
			<label>
				{$_('category')}
				<select name="category" required>
					<option label="" />
					{#each sustainableDevelopmentGoals.options as goal}
						<option value={goal}>
							{$_(goal)}
						</option>
					{/each}
				</select>
			</label>
			<RelationSelector {containerType} {isPartOfOptions} {selected} />
		</div>
	</div>

	<footer>
		<button class="primary">{$_('save')}</button>
	</footer>
</form>
