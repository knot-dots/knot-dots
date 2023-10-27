<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
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
	import Visibility from '$lib/components/Visibility.svelte';
	import {
		isEmptyInternalObjectiveStrategicGoalContainer,
		isEmptyInternalStrategyContainer,
		isEmptyMeasureContainer,
		isEmptyModelContainer,
		isEmptyMilestoneContainer,
		isEmptyOperationalGoalContainer,
		isEmptyOrganizationContainer,
		isEmptyOrganizationalUnitContainer,
		isEmptyStrategicGoalContainer,
		isEmptyStrategyContainer,
		isEmptyTaskContainer,
		isEmptyVisionContainer,
		payloadTypes,
		containerOfType
	} from '$lib/models';
	import type { CustomEventMap, PayloadType } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: payloadType = $page.params.type as PayloadType;

	$: isPartOfOptions = data.isPartOfOptions;

	$: container = ((type: PayloadType) => {
		const newContainer = containerOfType(
			type,
			$page.data.currentOrganization.guid,
			$page.data.currentOrganizationalUnit?.guid ?? null,
			env.PUBLIC_KC_REALM
		);
		if (newContainer.payload.type === payloadTypes.enum.organizational_unit) {
			newContainer.payload.level = parseInt($page.url.searchParams.get('level') ?? '1');
		}
		return newContainer;
	})(payloadType);

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('is-part-of', String(detail.result.revision));

		if (detail.event.submitter?.id === 'save-and-create-model') {
			await goto(`/model/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-strategic-goal') {
			await goto(`/strategic_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-operational-goal') {
			await goto(`/operational_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-measure') {
			await goto(`/measure/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-vision') {
			await goto(`/internal_objective.vision/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-internal-objective-strategic-goal') {
			await goto(`/internal_objective.strategic_goal/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-milestone') {
			await goto(`/internal_objective.milestone/new?${params}`);
		} else if (detail.event.submitter?.id === 'save-and-create-task') {
			await goto(`/internal_objective.task/new?${params}`);
		} else if (detail.result.payload.type === payloadTypes.enum.organizational_unit) {
			await goto(`/organization/${$page.data.currentOrganization.guid}/organizational_units`);
		} else {
			await goto(`/${payloadType}/${detail.result.guid}`);
		}

		if (
			detail.result.payload.type === payloadTypes.enum.organization ||
			detail.result.payload.type === payloadTypes.enum.organizational_unit
		) {
			invalidateAll();
		}
	}
</script>

<div class="detail-page-content">
	<header class="content-header">
		<label>
			{$_(`${container.payload.type}`)}
			{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
				<input name="name" type="text" bind:value={container.payload.name} required />
			{:else}
				<input name="title" type="text" bind:value={container.payload.title} required />
			{/if}
		</label>
	</header>
	<div class="content-details masked-overflow">
		{#if isEmptyMeasureContainer(container)}
			<MeasureForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyModelContainer(container)}
			<ModelForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyOperationalGoalContainer(container)}
			<OperationalGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyOrganizationContainer(container)}
			<OrganizationForm {container} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyOrganizationalUnitContainer(container)}
			<OrganizationalUnitForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyStrategicGoalContainer(container)}
			<StrategicGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyStrategyContainer(container)}
			<StrategyForm {container} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyInternalStrategyContainer(container)}
			<InternalObjectiveForm {container} isPartOfOptions={[]} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyVisionContainer(container)}
			<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyInternalObjectiveStrategicGoalContainer(container)}
			<InternalObjectiveForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{:else if isEmptyMilestoneContainer(container)}
			<InternalObjectiveMilestoneForm
				{container}
				{isPartOfOptions}
				on:submitSuccessful={afterSubmit}
			/>
		{:else if isEmptyTaskContainer(container)}
			<InternalObjectiveTaskForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
		{/if}
	</div>
	<footer class="content-footer">
		<Visibility {container} />
		<div class="content-actions">
			<button class="primary" form="container-form" type="submit">{$_('save')}</button>
			{#if isEmptyModelContainer(container)}
				<button id="save-and-create-strategic-goal" form="container-form" type="submit">
					{$_('save_and_create_strategic_goal')}
				</button>
			{:else if isEmptyOperationalGoalContainer(container)}
				<button id="save-and-create-measure" form="container-form" type="submit">
					{$_('save_and_create_measure')}
				</button>
			{:else if isEmptyStrategicGoalContainer(container)}
				<button id="save-and-create-operational-goal" form="container-form" type="submit">
					{$_('save_and_create_operational_goal')}
				</button>
			{:else if isEmptyStrategyContainer(container)}
				<button id="save-and-create-model" form="container-form" type="submit">
					{$_('save_and_create_model')}
				</button>
			{:else if isEmptyInternalStrategyContainer(container)}
				<button id="save-and-create-vision" form="container-form" type="submit">
					{$_('save_and_create_vision')}
				</button>
			{:else if isEmptyVisionContainer(container)}
				<button
					id="save-and-create-internal-objective-strategic-goal"
					form="container-form"
					type="submit"
				>
					{$_('save_and_create_strategic_goal')}
				</button>
			{:else if isEmptyInternalObjectiveStrategicGoalContainer(container)}
				<button id="save-and-create-milestone" form="container-form" type="submit">
					{$_('save_and_create_milestone')}
				</button>
			{:else if isEmptyMilestoneContainer(container)}
				<button id="save-and-create-task" form="container-form" type="submit">
					{$_('save_and_create_task')}
				</button>
			{/if}
		</div>
	</footer>
</div>
