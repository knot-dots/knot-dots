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
	import type { CustomEventMap, PartialRelation, PayloadType } from '$lib/models';
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
		const emptyContainer = containerOfType(
			type,
			$page.data.currentOrganization.guid,
			$page.data.currentOrganizationalUnit?.guid ?? null,
			env.PUBLIC_KC_REALM
		);
		emptyContainer.relation = selected;
		if (emptyContainer.payload.type === payloadTypes.enum.organizational_unit) {
			emptyContainer.payload.level = parseInt($page.url.searchParams.get('level') ?? '1');
		}
		return emptyContainer;
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
{:else if isEmptyOrganizationContainer(container)}
	<OrganizationForm {container} on:submitSuccessful={afterSubmit} />
{:else if isEmptyOrganizationalUnitContainer(container)}
	<OrganizationalUnitForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
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
			<button id="save-and-create-milestone">
				{$_('save_and_create_milestone')}
			</button>
		</svelte:fragment>
	</InternalObjectiveForm>
{:else if isEmptyMilestoneContainer(container)}
	<InternalObjectiveMilestoneForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-task">
				{$_('save_and_create_task')}
			</button>
		</svelte:fragment>
	</InternalObjectiveMilestoneForm>
{:else if isEmptyTaskContainer(container)}
	<InternalObjectiveTaskForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
{/if}
