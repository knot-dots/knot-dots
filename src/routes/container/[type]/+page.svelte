<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { applyAction, deserialize } from '$app/forms';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import { sustainableDevelopmentGoals } from '$lib/models';

	const { getKeycloak } = getContext<KeycloakContext>(key);

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
		</div>
	</div>

	<footer>
		<button class="primary">{$_('save')}</button>
	</footer>
</form>
