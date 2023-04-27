<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { getContext } from 'svelte';
	import { Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { applyAction, deserialize } from '$app/forms';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import { sustainableDevelopmentGoals } from '$lib/models';
	import type { Container } from '$lib/server/db';

	const { getKeycloak } = getContext<KeycloakContext>(key);

	export let container: Container;
	let editing = false;

	function toggleEditMode() {
		editing = !editing;
	}

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => null);
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

{#if !editing}
	<article>
		<header>
			<h2>{container.payload.title}</h2>
			<div class="icons">
				<button on:click={toggleEditMode} class="quiet">
					<Icon solid src={Pencil} size="20" />
				</button>
			</div>
		</header>

		<div class="content">
			<div class="content-column">
				<div class="summary">
					<h3>{$_('summary')}</h3>
					{container.payload.summary ?? ''}
				</div>
				<div class="description">
					<h3>{$_('description')}</h3>
					{container.payload.description}
				</div>
			</div>
			<div class="content-column">
				<div class="category">
					<h3>{$_('category')}</h3>
					{$_(container.payload.category)}
				</div>
			</div>
		</div>
	</article>
{:else}
	<form method="POST" on:submit|preventDefault={handleSubmit}>
		<header>
			<label>
				{$_('title')}
				<input name="title" type="text" value={container.payload.title} required />
			</label>
		</header>

		<div class="content">
			<div class="content-column">
				<label>
					{$_('summary')}
					<textarea name="summary" value={container.payload.summary ?? ''} required />
				</label>
				<label>
					{$_('description')}
					<textarea name="description" value={container.payload.description} required />
				</label>
			</div>
			<div class="content-column">
				<label>
					{$_('category')}
					<select name="category" required>
						<option label="" />
						{#each sustainableDevelopmentGoals.options as goal}
							<option selected={goal === container.payload.category} value={goal}>
								{$_(goal)}
							</option>
						{/each}
					</select>
				</label>
			</div>
		</div>

		<footer>
			<button class="primary">{$_('save')}</button>
			<button type="button" on:click={toggleEditMode}>{$_('cancel')}</button>
		</footer>
	</form>
{/if}

<style>
	article,
	form {
		background-color: white;
		border-radius: 8px;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-lg);
		height: calc(100% - 1rem);
	}

	@media (min-width: 768px) {
		article,
		form {
			padding: 2rem 4rem;
		}
	}

	header {
		align-items: center;
		border-bottom: solid 1px var(--color-gray-300);
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin-bottom: 24px;
		padding: 24px;
	}

	header h2,
	header label {
		font-size: 1.125rem;
		font-weight: 600;
	}

	header .icons {
		display: flex;
		gap: 16px;
	}

	.content {
		color: var(--color-gray-500);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 0 24px;
	}

	.content:before {
		border-bottom: 1px solid var(--color-gray-300);
		content: '';
		margin: 0 -24px;
	}

	.content > :first-child {
		order: -1;
	}

	.content-column {
		display: flex;
		flex-basis: 100%;
		flex-direction: column;
		flex: 1;
		gap: 18px;
	}

	@media (min-width: 1440px) {
		header {
			margin-bottom: 0;
		}

		.content {
			flex-direction: row;
		}

		.content:before {
			border-left: 1px solid var(--color-gray-300);
			content: '';
			margin: initial;
		}

		.content-column {
			padding-top: 24px;
		}
	}

	.category {
		display: flex;
		gap: 48px;
	}

	h3 {
		color: var(--color-gray-800);
		font-size: inherit;
		font-weight: 500;
	}

	footer {
		padding: 24px;
	}
</style>
