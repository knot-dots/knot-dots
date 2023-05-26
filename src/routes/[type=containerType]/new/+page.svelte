<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { containerTypes, status, sustainableDevelopmentGoals } from '$lib/models';
	import type {
		ContainerType,
		NewContainer,
		Relation,
		SustainableDevelopmentGoal
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	$: containerType = $page.params.type as ContainerType;

	$: isPartOfOptions = data.isPartOfOptions;

	$: selected = $page.url.searchParams
		.getAll('is-part-of')
		.map((o): Relation => ({ object: Number(o), predicate: 'is-part-of', subject: 0 }));

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);
		const container: NewContainer = {
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
			type: containerType,
			user: []
		};

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => reason);
		const response = await fetch('/container', {
			method: 'POST',
			body: JSON.stringify(container),
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
				await goto(`${result.guid}`);
			}
		}
	}
</script>

<form class="details" method="POST" on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_(containerType)}
			{#key containerType}
				<input name="title" type="text" required />
			{/key}
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				{#key containerType}
					<textarea name="summary" maxlength="200" required />
				{/key}
			</label>
			<label>
				{$_('description')}
				{#key containerType}
					<textarea name="description" required />
				{/key}
			</label>
		</div>
		<div class="details-content-column">
			{#if containerType === containerTypes.enum.measure}
				<label>
					{$_('status.label')}
					<select name="status" required>
						{#each status.options as statusOption}
							<option value={statusOption}>
								{$_(statusOption)}
							</option>
						{/each}
					</select>
				</label>
			{/if}
			<label>
				{$_('category')}
				{#key containerType}
					<select name="category" required>
						<option label="" />
						{#each sustainableDevelopmentGoals.options as goal}
							<option value={goal}>
								{$_(goal)}
							</option>
						{/each}
					</select>
				{/key}
			</label>
			<RelationSelector {containerType} {isPartOfOptions} {selected} />
		</div>
	</div>

	<footer>
		<button class="primary">{$_('save')}</button>
		{#if containerType === containerTypes.enum.strategy}
			<button id="save-and-create-model">
				{$_('save_and_create_model')}
			</button>
		{:else if containerType === containerTypes.enum.model}
			<button id="save-and-create-strategic-goal">
				{$_('save_and_create_strategic_goal')}
			</button>
		{:else if containerType === containerTypes.enum.strategic_goal}
			<button id="save-and-create-operational-goal">
				{$_('save_and_create_operational_goal')}
			</button>
		{:else if containerType === containerTypes.enum.operational_goal}
			<button id="save-and-create-measure">
				{$_('save_and_create_measure')}
			</button>
		{/if}
	</footer>
</form>
