<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';
	import InternalObjectiveMilestoneForm from '$lib/components/InternalObjectiveMilestoneForm.svelte';
	import InternalObjectiveTaskForm from '$lib/components/InternalObjectiveTaskForm.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import OrganizationalUnitForm from '$lib/components/OrganizationalUnitForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TextForm from '$lib/components/TextForm.svelte';
	import {
		isInternalObjectiveStrategicGoalContainer,
		isInternalStrategyContainer,
		isMeasureContainer,
		isModelContainer,
		isMilestoneContainer,
		isOperationalGoalContainer,
		isOrganizationalUnitContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isTaskContainer,
		isTextContainer,
		isVisionContainer,
		predicates
	} from '$lib/models';
	import type { CustomEventMap } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: isPartOfOptions = data.isPartOfOptions;

	$: isPartOfMeasure = container.relation
		.filter(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
		.map(({ object }) => object);

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		const params = new URLSearchParams([['is-part-of', String(detail.result.revision)]]);
		for (const revision of isPartOfMeasure) {
			params.append('is-part-of-measure', String(revision));
		}

		if (detail.event.submitter?.id === 'save-and-create-measure') {
			await goto(`/measure/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-model') {
			await goto(`/model/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-operational-goal') {
			await goto(`/operational_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-strategic-goal') {
			await goto(`/strategic_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-vision') {
			await goto(`/internal_objective.vision/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-internal-objective-strategic-goal') {
			await goto(`/internal_objective.strategic_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-milestone') {
			await goto(`/internal_objective.milestone/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-task') {
			await goto(`/internal_objective.task/new?${params}`);
		} else {
			await goto(`../${container.guid}`, { replaceState: true });
		}
	}

	async function afterDelete() {
		await goto('/');
	}
</script>

<div class="detail-page-content">
	{#if isMeasureContainer(container)}
		<MeasureForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		/>
	{:else if isModelContainer(container)}
		<ModelForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-strategic-goal">
					{$_('save_and_create_strategic_goal')}
				</button>
			</svelte:fragment>
		</ModelForm>
	{:else if isOperationalGoalContainer(container)}
		<OperationalGoalForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-measure">
					{$_('save_and_create_measure')}
				</button>
			</svelte:fragment>
		</OperationalGoalForm>
	{:else if isOrganizationalUnitContainer(container)}
		<OrganizationalUnitForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		/>
	{:else if isStrategicGoalGoalContainer(container)}
		<StrategicGoalForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-operational-goal">
					{$_('save_and_create_operational_goal')}
				</button>
			</svelte:fragment>
		</StrategicGoalForm>
	{:else if isStrategyContainer(container)}
		<StrategyForm {container} on:submitSuccessful={afterSubmit} on:deleteSuccessful={afterDelete}>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-model">
					{$_('save_and_create_model')}
				</button>
			</svelte:fragment>
		</StrategyForm>
	{:else if isTextContainer(container)}
		<TextForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		/>
	{:else if isInternalStrategyContainer(container)}
		<InternalObjectiveForm
			{container}
			isPartOfOptions={[]}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-vision">
					{$_('save_and_create_vision')}
				</button>
			</svelte:fragment>
		</InternalObjectiveForm>
	{:else if isVisionContainer(container)}
		<InternalObjectiveForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-internal-objective-strategic-goal">
					{$_('save_and_create_strategic_goal')}
				</button>
			</svelte:fragment>
		</InternalObjectiveForm>
	{:else if isInternalObjectiveStrategicGoalContainer(container)}
		<InternalObjectiveForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-milestone">
					{$_('save_and_create_milestone')}
				</button>
			</svelte:fragment>
		</InternalObjectiveForm>
	{:else if isMilestoneContainer(container)}
		<InternalObjectiveMilestoneForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		>
			<svelte:fragment slot="extra-buttons">
				<button id="save-and-create-task">
					{$_('save_and_create_task')}
				</button>
			</svelte:fragment>
		</InternalObjectiveMilestoneForm>
	{:else if isTaskContainer(container)}
		<InternalObjectiveTaskForm
			{container}
			{isPartOfOptions}
			on:submitSuccessful={afterSubmit}
			on:deleteSuccessful={afterDelete}
		/>
	{/if}
</div>
