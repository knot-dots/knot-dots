<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
	import ContainerEditForm from '$lib/components/ContainerEditForm.svelte';
	import { containerTypes, predicates } from '$lib/models';
	import type { ContainerType, ModifiedContainer, SustainableDevelopmentGoal } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: isPartOfOptions = data.isPartOfOptions;
	$: relationObjects = isPartOfOptions.filter(
		(o) =>
			container.relation.findIndex(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === o.revision
			) > -1
	);

	const { getKeycloak } = getContext<KeycloakContext>(key);

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);
		const indicatorContribution = new Map();

		for (let o of relationObjects) {
			if (data.has(`indicatorContribution-${o.guid}`)) {
				indicatorContribution.set(o.guid, data.get(`indicatorContribution-${o.guid}`));
			}
		}

		const modifiedContainer: ModifiedContainer = {
			guid: container.guid,
			payload: {
				category: data.get('category') as SustainableDevelopmentGoal,
				description: data.get('description') as string,
				summary: data.get('summary') as string,
				title: data.get('title') as string,
				...(data.has('status') ? { status: data.get('status') } : undefined),
				...(indicatorContribution.size > 0
					? { indicatorContribution: Object.fromEntries(indicatorContribution) }
					: undefined),
				...('indicator' in container.payload
					? { indicator: container.payload.indicator }
					: undefined)
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

<ContainerEditForm {container} {isPartOfOptions} {relationObjects} on:submit={handleSubmit}>
	<svelte:fragment slot="footer">
		<button id="save" class="primary">{$_('save')}</button>
		{#if container.type === containerTypes.enum.strategy}
			<button id="save-and-create-model">
				{$_('save_and_create_model')}
			</button>
		{:else if container.type === containerTypes.enum.model}
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
	</svelte:fragment>
</ContainerEditForm>
