<script lang="ts">
	import type { ActionResult } from '@sveltejs/kit';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { applyAction, deserialize } from '$app/forms';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { containerTypes, sustainableDevelopmentGoals } from '$lib/models';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import type { PageData } from './$types';

	export let data: PageData;

	const { container, isPartOfOptions } = data;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);

		if (event.submitter?.id === 'save-and-create-model') {
			data.append('redirect', `/container/model`);
		} else if (event.submitter?.id === 'save-and-create-strategic-goal') {
			data.append('redirect', `/container/strategic_goal`);
		} else if (event.submitter?.id === 'save-and-create-operational-goal') {
			data.append('redirect', `/container/operational_goal`);
		} else if (event.submitter?.id === 'save-and-create-measure') {
			data.append('redirect', `/container/measure`);
		}

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

<form class="details" method="POST" on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_(container.type)}
			<input name="title" type="text" value={container.payload.title} required />
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				<textarea name="summary" maxlength="200" value={container.payload.summary ?? ''} required />
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
		<button id="save" class="primary">{$_('save')}</button>
		{#if container.type === containerTypes.enum.strategy}
			<button id="save-and-create-model">
				{$_('save_and_create_model')}
			</button>
		{:else if container.type == containerTypes.enum.model}
			<button id="save-and-create-strategic-goal">
				{$_('save_and_create_strategic_goal')}
			</button>
		{:else if container.type === containerTypes.enum.strategic_goal}
			<button id="save-and-create-operational-goal">
				{$_('save_and_create_operational_goal')}
			</button>
		{:else if container.type === containerTypes.enum.operational_goal}
			<button id="save-and-create-measure">
				{$_('save_and_create_measure')}
			</button>
		{/if}
		<a href="../{container.guid}" class="button quiet">{$_('cancel')}</a>
	</footer>
</form>
