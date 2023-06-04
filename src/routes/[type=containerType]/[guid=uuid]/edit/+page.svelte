<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { containerTypes, status, sustainableDevelopmentGoals } from '$lib/models';
	import type { ContainerType, ModifiedContainer, SustainableDevelopmentGoal } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	const { container, isPartOfOptions } = data;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);
		const modifiedContainer: ModifiedContainer = {
			guid: container.guid,
			payload: {
				category: data.get('category') as SustainableDevelopmentGoal,
				description: data.get('description') as string,
				summary: data.get('summary') as string,
				title: data.get('title') as string,
				...(data.has('status') ? { status: data.get('status') } : undefined)
			},
			realm: env.PUBLIC_KC_REALM ?? '',
			relation: data
				.getAll('is-part-of')
				.map((v) => ({ predicate: 'is-part-of', object: Number(v) })),
			type: container.type as ContainerType,
			user: []
		};

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => null);
		const response = await fetch(`/container/${container.guid}/revision`, {
			method: 'POST',
			body: JSON.stringify(modifiedContainer),
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined),
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const result = await response.json();

			if (event.submitter?.id === 'save-and-create-model') {
				await goto(`/model/new?is-part-of=${result.revision}`);
			} else if (event.submitter?.id === 'save-and-create-strategic-goal') {
				await goto(`/strategic_goal/new?is-part-of=${result.revision}`);
			} else if (event.submitter?.id === 'save-and-create-operational-goal') {
				await goto(`/operational_goal/new?is-part-of=${result.revision}`);
			} else if (event.submitter?.id === 'save-and-create-measure') {
				await goto(`/measure/new?is-part-of=${result.revision}`);
			} else {
				await goto(`../${container.guid}`);
			}
		}
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
			{#if 'status' in container.payload}
				<label>
					{$_('status.label')}
					<select name="status" required>
						{#each status.options as statusOption}
							<option selected={statusOption === container.payload.status} value={statusOption}>
								{$_(statusOption)}
							</option>
						{/each}
					</select>
				</label>
			{/if}
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
		<a href="../{container.guid}" class="button">{$_('cancel')}</a>
	</footer>
</form>
