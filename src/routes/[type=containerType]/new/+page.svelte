<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';
	import InternalObjectiveTaskForm from '$lib/components/InternalObjectiveTaskForm.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import {
		isEmptyInternalObjectiveStrategicGoalContainer,
		isEmptyInternalStrategyContainer,
		isEmptyMeasureContainer,
		isEmptyModelContainer,
		isEmptyOkrContainer,
		isEmptyOperationalGoalContainer,
		isEmptyStrategicGoalContainer,
		isEmptyStrategyContainer,
		isEmptyTaskContainer,
		isEmptyVisionContainer,
		payloadTypes
	} from '$lib/models';
	import type {
		CustomEventMap,
		EmptyMeasureContainer,
		EmptyModelContainer,
		EmptyOperationalGoalContainer,
		EmptyStrategicGoalContainer,
		EmptyStrategyContainer,
		Indicator,
		PartialRelation,
		PayloadType,
		SustainableDevelopmentGoal,
		Topic
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: payloadType = $page.params.type as PayloadType;

	$: isPartOfOptions = data.isPartOfOptions;

	$: selected = $page.url.searchParams
		.getAll('is-part-of')
		.map(
			(o): PartialRelation => ({
				object: Number(o),
				position: 2 ** 32 - 1,
				predicate: 'is-part-of'
			})
		)
		.concat(
			$page.url.searchParams.getAll('is-part-of-measure').map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 2 ** 32 - 1,
					predicate: 'is-part-of-measure'
				})
			)
		);

	$: container = ((type: PayloadType) => {
		const base = { realm: env.PUBLIC_KC_REALM, relation: selected, user: [] };
		const category: SustainableDevelopmentGoal[] = [];
		const indicator: Indicator[] = [];
		const resource: [] = [];
		const topic: Topic[] = [];
		switch (type) {
			case payloadTypes.enum.measure:
				return { ...base, payload: { category, resource, topic, type } } as EmptyMeasureContainer;
			case payloadTypes.enum.model:
				return { ...base, payload: { category, topic, type } } as EmptyModelContainer;
			case payloadTypes.enum.operational_goal:
				return {
					...base,
					payload: { category, indicator, topic, type }
				} as EmptyOperationalGoalContainer;
			case payloadTypes.enum.strategic_goal:
				return { ...base, payload: { category, topic, type } } as EmptyStrategicGoalContainer;
			default:
				return { ...base, payload: { category, topic, type } } as EmptyStrategyContainer;
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
		} else if (detail.event.submitter?.id === 'save-and-create-vision') {
			await goto(
				`/internal_objective.vision/new?is-part-of=${
					detail.result.revision
				}&is-part-of-measure${$page.url.searchParams.get('is-part-of-measure')}`
			);
		} else if (detail.event.submitter?.id === 'save-and-create-internal-objective-strategic-goal') {
			await goto(
				`/internal_objective.strategic_goal/new?is-part-of=${
					detail.result.revision
				}&is-part-of-measure${$page.url.searchParams.get('is-part-of-measure')}`
			);
		} else if (detail.event.submitter?.id === 'save-and-create-okr') {
			await goto(
				`/internal_objective.okr/new?is-part-of=${
					detail.result.revision
				}&is-part-of-measure${$page.url.searchParams.get('is-part-of-measure')}`
			);
		} else if (detail.event.submitter?.id === 'save-and-create-task') {
			await goto(
				`/internal_objective.task/new?is-part-of=${
					detail.result.revision
				}&is-part-of-measure${$page.url.searchParams.get('is-part-of-measure')}`
			);
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
{:else if isEmptyInternalStrategyContainer(container)}
	<InternalObjectiveForm {container} isPartOfOptions={[]} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-vision">
				{$_('save_and_create_vision')}
			</button>
		</svelte:fragment>
	</InternalObjectiveForm>
{:else if isEmptyVisionContainer(container)}
	<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-internal-objective-strategic-goal">
				{$_('save_and_create_strategic_goal')}
			</button>
		</svelte:fragment>
	</InternalObjectiveForm>
{:else if isEmptyInternalObjectiveStrategicGoalContainer(container)}
	<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-okr">
				{$_('save_and_create_okr')}
			</button>
		</svelte:fragment>
	</InternalObjectiveForm>
{:else if isEmptyOkrContainer(container)}
	<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-task">
				{$_('save_and_create_task')}
			</button>
		</svelte:fragment>
	</InternalObjectiveForm>
{:else if isEmptyTaskContainer(container)}
	<InternalObjectiveTaskForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
{/if}
