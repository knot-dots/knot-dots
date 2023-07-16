<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TextForm from '$lib/components/TextForm.svelte';
	import {
		isMeasureContainer,
		isModelContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isTextContainer
	} from '$lib/models';
	import type { CustomEventMap } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: isPartOfOptions = data.isPartOfOptions;

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		if (detail.event.submitter?.id === 'save-and-create-measure') {
			await goto(`/measure/new?is-part-of=${detail.result.revision}`);
		} else if (detail.event.submitter?.id === 'save-and-create-model') {
			await goto(`/model/new?is-part-of=${detail.result.revision}`);
		} else if (detail.event.submitter?.id === 'save-and-create-operational-goal') {
			await goto(`/operational_goal/new?is-part-of=${detail.result.revision}`);
		} else if (detail.event.submitter?.id === 'save-and-create-strategic-goal') {
			await goto(`/strategic_goal/new?is-part-of=${detail.result.revision}`);
		} else {
			await goto(`../${container.guid}`);
		}
	}
</script>

{#if isMeasureContainer(container)}
	<MeasureForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
{:else if isModelContainer(container)}
	<ModelForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-strategic-goal">
				{$_('save_and_create_strategic_goal')}
			</button>
		</svelte:fragment>
	</ModelForm>
{:else if isOperationalGoalContainer(container)}
	<OperationalGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-measure">
				{$_('save_and_create_measure')}
			</button>
		</svelte:fragment>
	</OperationalGoalForm>
{:else if isStrategicGoalGoalContainer(container)}
	<StrategicGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-operational-goal">
				{$_('save_and_create_operational_goal')}
			</button>
		</svelte:fragment>
	</StrategicGoalForm>
{:else if isStrategyContainer(container)}
	<StrategyForm {container} on:submitSuccessful={afterSubmit}>
		<svelte:fragment slot="extra-buttons">
			<button id="save-and-create-model">
				{$_('save_and_create_model')}
			</button>
		</svelte:fragment>
	</StrategyForm>
{:else if isTextContainer(container)}
	<TextForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
{/if}
