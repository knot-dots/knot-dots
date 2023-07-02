<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import {
		isEmptyMeasureContainer,
		isEmptyModelContainer,
		isEmptyOperationalGoalContainer,
		isEmptyStrategicGoalContainer,
		isEmptyStrategyContainer,
		payloadTypes
	} from '$lib/models';
	import type {
		CustomEventMap,
		EmptyMeasureContainer,
		EmptyModelContainer,
		EmptyOperationalGoalContainer,
		EmptyStrategicGoalContainer,
		EmptyStrategyContainer,
		PartialRelation,
		PayloadType
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: payloadType = $page.params.type as PayloadType;

	$: isPartOfOptions = data.isPartOfOptions;

	$: selected = $page.url.searchParams
		.getAll('is-part-of')
		.map((o): PartialRelation => ({ object: Number(o), predicate: 'is-part-of' }));

	$: container = ((type: PayloadType) => {
		const base = { realm: env.PUBLIC_KC_REALM, relation: selected, user: [] };
		switch (type) {
			case payloadTypes.enum.measure:
				return { ...base, payload: { type } } as EmptyMeasureContainer;
			case payloadTypes.enum.model:
				return { ...base, payload: { type } } as EmptyModelContainer;
			case payloadTypes.enum.operational_goal:
				return { ...base, payload: { indicator: [], type } } as EmptyOperationalGoalContainer;
			case payloadTypes.enum.strategic_goal:
				return { ...base, payload: { type } } as EmptyStrategicGoalContainer;
			default:
				return { ...base, payload: { type } } as EmptyStrategyContainer;
		}
	})(payloadType);

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		if (detail.event.submitter?.id === 'save-and-create-model') {
			await goto(`/model/new?is-part-of=${detail.result.revision}`);
		} else if (detail.event.submitter?.id === 'save-and-create-strategic-goal') {
			await goto(`/strategic_goal/new?is-part-of=${detail.result.revision}`);
		} else if (detail.event.submitter?.id === 'save-and-create-operational-goal') {
			await goto(`/operational_goal/new?is-part-of=${detail.result.revision}`);
		} else if (detail.event.submitter?.id === 'save-and-create-measure') {
			await goto(`/measure/new?is-part-of=${detail.result.revision}`);
		} else {
			await goto(`/${payloadType}/${detail.result.guid}`);
		}
	}
</script>

{#if isEmptyMeasureContainer(container)}
	<MeasureForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
{:else if isEmptyModelContainer(container)}
	<ModelForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-strategic-goal">
				{$_('save_and_create_strategic_goal')}
			</button>
		</svelte:fragment>
	</ModelForm>
{:else if isEmptyOperationalGoalContainer(container)}
	<OperationalGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-measure">
				{$_('save_and_create_measure')}
			</button>
		</svelte:fragment>
	</OperationalGoalForm>
{:else if isEmptyStrategicGoalContainer(container)}
	<StrategicGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-operational-goal">
				{$_('save_and_create_operational_goal')}
			</button>
		</svelte:fragment>
	</StrategicGoalForm>
{:else if isEmptyStrategyContainer(container)}
	<StrategyForm {container} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-model">
				{$_('save_and_create_model')}
			</button>
		</svelte:fragment>
	</StrategyForm>
{/if}
