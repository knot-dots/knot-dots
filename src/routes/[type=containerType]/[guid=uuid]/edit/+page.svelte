<script lang="ts">
	import { Icon, Trash } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import deleteContainer from '$lib/client/deleteContainer';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import ContainerFormTabs from '$lib/components/ContainerFormTabs.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import {
		isInternalObjectiveStrategicGoalContainer,
		isInternalStrategyContainer,
		isModelContainer,
		isMilestoneContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isVisionContainer,
		mayDelete,
		payloadTypes,
		predicates
	} from '$lib/models';
	import type { CustomEventMap } from '$lib/models';
	import { applicationState } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	$: container = data.container;
	$: isPartOfOptions = data.isPartOfOptions;

	$: isPartOfMeasure = container.relation
		.filter(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
		.map(({ object }) => object);

	$: isPartOfStrategy = container.relation
		.filter(({ predicate }) => predicate === predicates.enum['is-part-of-strategy'])
		.map(({ object }) => object);

	async function afterSubmit({ detail }: CustomEvent<CustomEventMap['submitSuccessful']>) {
		const params = new URLSearchParams([['is-part-of', String(detail.result.revision)]]);
		for (const revision of isPartOfMeasure) {
			params.append('is-part-of-measure', String(revision));
		}
		for (const revision of isPartOfStrategy) {
			params.append('is-part-of-strategy', String(revision));
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
			await goto(`../${container.guid}`);
		}
	}

	async function handleDelete() {
		const response = await deleteContainer(container);
		if (response.ok) {
			await goto('/', { invalidateAll: true });
		}
	}
</script>

<div class="detail-page-content">
	<header class="content-header">
		<label>
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
					required
				/>
			{/if}
		</label>
	</header>
	<div class="content-details masked-overflow">
		{#if $applicationState.containerForm.tabs.length > 0}
			<aside>
				<ContainerFormTabs {container} />
			</aside>
		{/if}
		<ContainerForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit} />
	</div>
	<footer class="content-footer">
		<Visibility {container} />
		<div class="content-actions">
			<button class="primary" form="container-form" type="submit">{$_('save')}</button>
			{#if isModelContainer(container)}
				<button id="save-and-create-strategic-goal" form="container-form" type="submit">
					{$_('save_and_create_strategic_goal')}
				</button>
			{:else if isOperationalGoalContainer(container)}
				<button id="save-and-create-measure" form="container-form" type="submit">
					{$_('save_and_create_measure')}
				</button>
			{:else if isStrategicGoalGoalContainer(container)}
				<button id="save-and-create-operational-goal" form="container-form" type="submit">
					{$_('save_and_create_operational_goal')}
				</button>
			{:else if isStrategyContainer(container)}
				<button id="save-and-create-model" form="container-form" type="submit">
					{$_('save_and_create_model')}
				</button>
			{:else if isInternalStrategyContainer(container)}
				<button id="save-and-create-vision" form="container-form" type="submit">
					{$_('save_and_create_vision')}
				</button>
			{:else if isVisionContainer(container)}
				<button
					id="save-and-create-internal-objective-strategic-goal"
					form="container-form"
					type="submit"
				>
					{$_('save_and_create_strategic_goal')}
				</button>
			{:else if isInternalObjectiveStrategicGoalContainer(container)}
				<button id="save-and-create-milestone" form="container-form" type="submit">
					{$_('save_and_create_milestone')}
				</button>
			{:else if isMilestoneContainer(container)}
				<button id="save-and-create-task" form="container-form" type="submit">
					{$_('save_and_create_task')}
				</button>
			{/if}
			<a class="button" href=".">{$_('cancel')}</a>
			{#if mayDelete(container)}
				<button class="delete quiet" title={$_('delete')} type="button" on:click={handleDelete}>
					<Icon src={Trash} size="20" />
				</button>
			{/if}
		</div>
	</footer>
</div>
