<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { getContext } from 'svelte';
	import { Icon, Pencil } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { applyAction, deserialize } from '$app/forms';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { sustainableDevelopmentGoals } from '$lib/models';
	import type { Container } from '$lib/server/db';

	const { getKeycloak } = getContext<KeycloakContext>(key);

	export let container: Container;
	export let isPartOfOptions: Container[];
	export let relationObjects: Container[];

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
	<article class="details">
		<header>
			<h2>{container.payload.title}</h2>
			<div class="icons">
				<button on:click={toggleEditMode} class="quiet">
					<Icon solid src={Pencil} size="20" />
				</button>
			</div>
		</header>

		<div class="details-content">
			<div class="details-content-column">
				<div class="summary">
					<h3>{$_('summary')}</h3>
					{container.payload.summary ?? ''}
				</div>
				<div class="description">
					<h3>{$_('description')}</h3>
					{container.payload.description}
				</div>
			</div>
			<div class="details-content-column">
				<div class="meta">
					<h3 class="meta-key">{$_('category')}</h3>
					<ul class="meta-value">
						<li>{$_(container.payload.category)}</li>
					</ul>
				</div>
				<div class="meta">
					<h3 class="meta-key">{$_('relations')}</h3>
					<ul class="meta-value">
						{#each relationObjects as { guid, payload, type }}
							<li>
								<a href="/container/{type}/{guid}">{payload.title}</a>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</article>
{:else}
	<form class="details" method="POST" on:submit|preventDefault={handleSubmit}>
		<header>
			<label>
				{$_('title')}
				<input name="title" type="text" value={container.payload.title} required />
			</label>
		</header>

		<div class="details-content">
			<div class="details-content-column">
				<label>
					{$_('summary')}
					<textarea
						name="summary"
						maxlength="200"
						value={container.payload.summary ?? ''}
						required
					/>
				</label>
				<label>
					{$_('description')}
					<textarea name="description" value={container.payload.description} required />
				</label>
			</div>
			<div class="details-content-column">
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
				<RelationSelector
					{isPartOfOptions}
					containerType={container.type}
					selected={container.relation}
				/>
			</div>
		</div>

		<footer>
			<button class="primary">{$_('save')}</button>
			<button type="button" on:click={toggleEditMode}>{$_('cancel')}</button>
		</footer>
	</form>
{/if}

<style>
	.meta {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 48px;
	}
	.meta-key {
		flex: 0 0 140px;
	}
	.meta-value {
		flex: 1;
	}
</style>
