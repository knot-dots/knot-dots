<script lang="ts">
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import InternalObjectiveDetailView from '$lib/components/InternalObjectiveDetailView.svelte';
	import InternalObjectiveForm from '$lib/components/InternalObjectiveForm.svelte';
	import InternalObjectiveMilestoneForm from '$lib/components/InternalObjectiveMilestoneForm.svelte';
	import InternalObjectiveTaskDetailView from '$lib/components/InternalObjectiveTaskDetailView.svelte';
	import InternalObjectiveTaskForm from '$lib/components/InternalObjectiveTaskForm.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import OrganizationForm from '$lib/components/OrganizationForm.svelte';
	import OrganizationalUnitForm from '$lib/components/OrganizationalUnitForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TaskTabs from '$lib/components/TaskTabs.svelte';
	import {
		isContainer,
		isInternalObjectiveContainer,
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
		isVisionContainer,
		isOrganizationContainer,
		payloadTypes
	} from '$lib/models';
	import type { AnyContainer, Container } from '$lib/models';
	import { ability } from '$lib/stores';

	export let relatedContainers: Container[];
	export let isPartOfOptions: AnyContainer[];
	export let revisions: AnyContainer[];

	$: container = revisions[revisions.length - 1];

	let edit = $page.url.searchParams.has('overlay-new');

	function closeOverlay() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		query.delete('is-part-of-measure');
		query.delete('level');
		query.delete('overlay-new');
		query.delete('status');
		query.delete('task-status');
		return `?${query.toString()}`;
	}

	async function afterSubmit() {
		await invalidateAll();
		if ($page.url.searchParams.has('overlay-new')) {
			await goto(closeOverlay());
		} else {
			edit = false;
		}
	}

	async function afterDelete() {
		await goto(closeOverlay(), { invalidateAll: true });
	}

	async function cancel() {
		if ($page.url.searchParams.has('overlay-new')) {
			await goto(closeOverlay());
		} else {
			edit = false;
		}
	}
</script>

<section class="overlay" transition:slide={{ axis: 'x' }}>
	{#if edit}
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
		<div class="content-details">
			{#if isMeasureContainer(container)}
				<MeasureForm
					{container}
					{isPartOfOptions}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</MeasureForm>
			{:else if isModelContainer(container)}
				<ModelForm
					{container}
					{isPartOfOptions}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
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
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</OperationalGoalForm>
			{:else if isOrganizationContainer(container)}
				<OrganizationForm
					{container}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</OrganizationForm>
			{:else if isOrganizationalUnitContainer(container)}
				<OrganizationalUnitForm
					{container}
					{isPartOfOptions}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</OrganizationalUnitForm>
			{:else if isStrategicGoalGoalContainer(container)}
				<StrategicGoalForm
					{container}
					{isPartOfOptions}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</StrategicGoalForm>
			{:else if isStrategyContainer(container)}
				<StrategyForm
					{container}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</StrategyForm>
			{:else if isInternalStrategyContainer(container)}
				<InternalObjectiveForm
					{container}
					isPartOfOptions={[]}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
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
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
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
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
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
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</InternalObjectiveMilestoneForm>
			{:else if isTaskContainer(container)}
				<InternalObjectiveTaskForm
					{container}
					{isPartOfOptions}
					on:submitSuccessful={afterSubmit}
					on:deleteSuccessful={afterDelete}
				>
					<svelte:fragment slot="extra-buttons">
						<button type="button" on:click={() => cancel()}>{$_('cancel')}</button>
					</svelte:fragment>
				</InternalObjectiveTaskForm>
			{/if}
		</div>
	{:else}
		<header class="content-header">
			<h2 class="with-icons">
				{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
					{container.payload.name}
				{:else}
					{container.payload.title}
				{/if}
				<span class="icons">
					{#if $ability.can('update', container)}
						<button class="icons-element" on:click={() => (edit = true)}>
							<Icon solid src={Pencil} size="20" />
						</button>
					{/if}
					<a href={closeOverlay()} class="button icons-element">
						<Icon solid src={XMark} size="20" />
					</a>
				</span>
			</h2>
			{#if isMeasureContainer(container)}
				<MeasureTabs {container} {revisions} />
			{:else if isTaskContainer(container)}
				<TaskTabs {container} {revisions} />
			{/if}
		</header>
		<div class="content-details">
			{#if isMeasureContainer(container)}
				<MeasureDetailView {container} {relatedContainers} {revisions} />
			{:else if isTaskContainer(container)}
				<InternalObjectiveTaskDetailView {container} {relatedContainers} {revisions} />
			{:else if isInternalObjectiveContainer(container)}
				<InternalObjectiveDetailView {container} {relatedContainers} {revisions} />
			{:else if isOrganizationalUnitContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{:else if isContainer(container)}
				<ContainerDetailView {container} {relatedContainers} {revisions} />
			{/if}
		</div>
	{/if}
</section>

<style>
	.overlay {
		background-color: white;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 80%;
		}

		.overlay > * {
			min-width: calc((100vw - 18rem) * 0.8 - 2px);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 65%;
		}

		.overlay > * {
			min-width: calc((100vw - 22rem) * 0.65 - 2px);
		}
	}
</style>
