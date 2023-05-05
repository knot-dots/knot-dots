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
				<textarea name="summary" required />
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

<style>
	.details {
		background-color: white;
		border-radius: 8px;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-lg);
		height: calc(100% - 1rem);
	}

	@media (min-width: 768px) {
		.details {
			padding: 2rem 4rem;
		}
	}

	.details header {
		align-items: center;
		border-bottom: solid 1px var(--color-gray-300);
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-bottom: 24px;
		padding: 24px;
	}

	.details header label {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.details-content {
		color: var(--color-gray-500);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 0 24px;
	}

	.details-content:before {
		border-bottom: 1px solid var(--color-gray-300);
		content: '';
		margin: 0 -24px;
	}

	.details-content > :first-child {
		order: -1;
	}

	.details-content .details-content-column {
		display: flex;
		flex-basis: 100%;
		flex-direction: column;
		flex: 1;
		gap: 18px;
	}

	@media (min-width: 1440px) {
		.details > header {
			margin-bottom: 0;
		}

		.details-content {
			flex-direction: row;
		}

		.details-content:before {
			border-left: 1px solid var(--color-gray-300);
			content: '';
			margin: initial;
		}

		.details-content-column {
			padding-top: 24px;
		}
	}

	.details footer {
		padding: 24px;
	}
</style>
