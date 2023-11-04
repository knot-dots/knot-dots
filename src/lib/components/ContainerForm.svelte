<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { uploadAsFormData } from '$lib/client/upload';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';
	import InternalObjectiveMilestoneForm from '$lib/components/InternalObjectiveMilestoneForm.svelte';
	import InternalObjectiveTaskForm from '$lib/components/InternalObjectiveTaskForm.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import OrganizationForm from '$lib/components/OrganizationForm.svelte';
	import OrganizationalUnitForm from '$lib/components/OrganizationalUnitForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TextForm from '$lib/components/TextForm.svelte';
	import {
		isInternalObjectiveStrategicGoalContainer,
		isInternalStrategyContainer,
		isMeasureContainer,
		isMilestoneContainer,
		isModelContainer,
		isOperationalGoalContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isTaskContainer,
		isTextContainer,
		isVisionContainer,
		modifiedContainer,
		newContainer,
		payloadTypes
	} from '$lib/models';
	import type {
		AnyContainer,
		Container,
		CustomEventMap,
		ModifiedContainer,
		NewContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: AnyContainer;
	export let isPartOfOptions: AnyContainer[];

	const dispatch = createEventDispatcher<Pick<CustomEventMap, 'submitSuccessful'>>();

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
</script>

<form class="details" id="container-form" on:submit|preventDefault={handleSubmit}>
	{#if isMeasureContainer(container)}
		<MeasureForm {isPartOfOptions} bind:container />
	{:else if isModelContainer(container)}
		<ModelForm {isPartOfOptions} bind:container />
	{:else if isOperationalGoalContainer(container)}
		<OperationalGoalForm {isPartOfOptions} bind:container />
	{:else if isOrganizationContainer(container)}
		<OrganizationForm bind:container />
	{:else if isOrganizationalUnitContainer(container)}
		<OrganizationalUnitForm {isPartOfOptions} bind:container />
	{:else if isStrategicGoalGoalContainer(container)}
		<StrategicGoalForm {isPartOfOptions} bind:container />
	{:else if isStrategyContainer(container)}
		<StrategyForm bind:container />
	{:else if isTextContainer(container)}
		<TextForm {isPartOfOptions} bind:container />
	{:else if isInternalStrategyContainer(container)}
		<InternalObjectiveForm isPartOfOptions={[]} bind:container />
	{:else if isVisionContainer(container)}
		<InternalObjectiveForm {isPartOfOptions} bind:container />
	{:else if isInternalObjectiveStrategicGoalContainer(container)}
		<InternalObjectiveForm {isPartOfOptions} bind:container />
	{:else if isMilestoneContainer(container)}
		<InternalObjectiveMilestoneForm {isPartOfOptions} bind:container />
	{:else if isTaskContainer(container)}
		<InternalObjectiveTaskForm {isPartOfOptions} bind:container />
	{/if}
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
</form>
