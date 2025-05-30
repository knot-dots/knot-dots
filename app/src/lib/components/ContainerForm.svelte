<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { env } from '$env/dynamic/public';
	import { uploadAsFormData } from '$lib/client/upload';
	import EffectForm from '$lib/components/EffectForm.svelte';
	import IndicatorForm from '$lib/components/IndicatorForm.svelte';
	import IndicatorTemplateForm from '$lib/components/IndicatorTemplateForm.svelte';
	import GoalForm from '$lib/components/GoalForm.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ObjectiveForm from '$lib/components/ObjectiveForm.svelte';
	import OrganizationForm from '$lib/components/OrganizationForm.svelte';
	import OrganizationalUnitForm from '$lib/components/OrganizationalUnitForm.svelte';
	import PageForm from '$lib/components/PageForm.svelte';
	import ResolutionForm from '$lib/components/ResolutionForm.svelte';
	import ResourceForm from '$lib/components/ResourceForm.svelte';
	import SimpleMeasureForm from '$lib/components/SimpleMeasureForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TaskForm from '$lib/components/TaskForm.svelte';
	import TextForm from '$lib/components/TextForm.svelte';
	import UndefinedForm from '$lib/components/UndefinedForm.svelte';
	import {
		isEffectContainer,
		isGoalContainer,
		isIndicatorContainer,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isObjectiveContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isPageContainer,
		isResolutionContainer,
		isResourceContainer,
		isSimpleMeasureContainer,
		isStrategyContainer,
		isTaskContainer,
		isTextContainer,
		modifiedContainer,
		newContainer,
		payloadTypes,
		quantities
	} from '$lib/models';
	import type {
		AnyContainer,
		Container,
		CustomEventMap,
		ModifiedContainer,
		NewContainer
	} from '$lib/models';

	export let container: AnyContainer;

	const dispatch = createEventDispatcher<Pick<CustomEventMap, 'submitSuccessful'>>();

	async function handleSubmit(event: SubmitEvent) {
		let url = '/container';
		let data: ModifiedContainer | NewContainer;

		const formData = new FormData(event.target as HTMLFormElement);

		const parseResult = z.union([modifiedContainer, newContainer]).safeParse({
			...container,
			realm: env.PUBLIC_KC_REALM
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
					type K = keyof typeof data.payload;

					try {
						const url = await uploadAsFormData(value as File);
						data.payload = {
							...data.payload,
							[name]: Array.isArray(data.payload[name as K])
								? [...data.payload[name as K], [url, (value as File).name.replace(/\.[^/.]+$/, '')]]
								: url
						};
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
	<label
		class="details-title"
		style={container.payload.type === payloadTypes.enum.undefined ||
		(container.payload.type === payloadTypes.enum.indicator && !container.payload.quantity)
			? 'display: none;'
			: undefined}
	>
		{$_(`${container.payload.type}`)}
		{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
			<input
				form="container-form"
				name="name"
				type="text"
				bind:value={container.payload.name}
				required
			/>
		{:else}
			<input
				form="container-form"
				name="title"
				type="text"
				bind:value={container.payload.title}
				readonly={container.payload.type === payloadTypes.enum.indicator &&
					container.payload.quantity !== quantities.enum['quantity.custom']}
				required
			/>
		{/if}
	</label>
	{#if isEffectContainer(container)}
		<EffectForm bind:container />
	{:else if isIndicatorContainer(container)}
		<IndicatorForm bind:container />
	{:else if isIndicatorTemplateContainer(container)}
		<IndicatorTemplateForm bind:container />
	{:else if isGoalContainer(container)}
		<GoalForm bind:container />
	{:else if isMeasureContainer(container)}
		<MeasureForm bind:container />
	{:else if isObjectiveContainer(container)}
		<ObjectiveForm bind:container />
	{:else if isOrganizationContainer(container)}
		<OrganizationForm bind:container />
	{:else if isOrganizationalUnitContainer(container)}
		<OrganizationalUnitForm bind:container />
	{:else if isPageContainer(container)}
		<PageForm bind:container />
	{:else if isResolutionContainer(container)}
		<ResolutionForm bind:container />
	{:else if isResourceContainer(container)}
		<ResourceForm bind:container />
	{:else if isSimpleMeasureContainer(container)}
		<SimpleMeasureForm bind:container />
	{:else if isStrategyContainer(container)}
		<StrategyForm bind:container />
	{:else if isTaskContainer(container)}
		<TaskForm bind:container />
	{:else if isTextContainer(container)}
		<TextForm bind:container />
	{:else}
		<UndefinedForm bind:container />
	{/if}
</form>

<style>
	.details-title {
		display: block;
	}

	.details-title input {
		font-size: 1rem;
		font-weight: 400;
		line-height: 1.2;
	}
</style>
