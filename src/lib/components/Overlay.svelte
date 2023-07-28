<script lang="ts">
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import InternalObjectiveDetailView from './InternalObjectiveDetailView.svelte';
	import InternalObjectiveStrategicGoalForm from './InternalObjectiveStrategicGoalForm.svelte';
	import InternalStrategyForm from './InternalStrategyForm.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OkrForm from './okrForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TaskForm from './TaskForm.svelte';
	import VisionForm from './VisionForm.svelte';
	import {
		isInternalObjectiveContainer,
		isInternalObjectiveStrategicGoalContainer,
		isInternalStrategyContainer,
		isMeasureContainer,
		isModelContainer,
		isOKRContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isTaskContainer,
		isVisionContainer
	} from '$lib/models';
	import type { Container } from '$lib/models';
	import { sidebarToggle, user } from '$lib/stores.js';

	export let relatedContainers: Container[];
	export let isPartOfOptions: Container[];
	export let revisions: Container[];

	$: container = revisions[revisions.length - 1];

	let edit = false;

	function closeOverlay() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		query.delete('status');
		return `?${query.toString()}`;
	}

	async function afterSubmit() {
		await invalidateAll();
		edit = false;
	}

	async function afterDelete() {
		await goto(closeOverlay(), { invalidateAll: true });
	}
</script>

<div class="overlay" transition:slide={{ axis: 'x' }}>
	{#if edit}
		{#if isMeasureContainer(container)}
			<MeasureForm
				{container}
				{isPartOfOptions}
				on:submitSuccessful={afterSubmit}
				on:deleteSuccessful={afterDelete}
			>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
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
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
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
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</OperationalGoalForm>
		{:else if isStrategicGoalGoalContainer(container)}
			<StrategicGoalForm
				{container}
				{isPartOfOptions}
				on:submitSuccessful={afterSubmit}
				on:deleteSuccessful={afterDelete}
			>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</StrategicGoalForm>
		{:else if isStrategyContainer(container)}
			<StrategyForm {container} on:submitSuccessful={afterSubmit} on:deleteSuccessful={afterDelete}>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</StrategyForm>
		{:else if isInternalStrategyContainer(container)}
			<InternalStrategyForm {container} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</InternalStrategyForm>
		{:else if isVisionContainer(container)}
			<VisionForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</VisionForm>
		{:else if isInternalObjectiveStrategicGoalContainer(container)}
			<InternalObjectiveStrategicGoalForm
				{container}
				{isPartOfOptions}
				on:submitSuccessful={afterSubmit}
			>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</InternalObjectiveStrategicGoalForm>
		{:else if isOKRContainer(container)}
			<OkrForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</OkrForm>
		{:else if isTaskContainer(container)}
			<TaskForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
				</svelte:fragment>
			</TaskForm>
		{/if}
	{:else if isMeasureContainer(container)}
		<MeasureDetailView {container} {relatedContainers} {revisions}>
			<svelte:fragment slot="header">
				<h2>{container.payload.title}</h2>
				<div class="icons">
					{#if $user.isAuthenticated}
						<button class="icons-element" on:click={() => (edit = true)}>
							<Icon solid src={Pencil} size="20" />
						</button>
					{/if}
					<a
						href={closeOverlay()}
						class="button icons-element"
						on:click={() => ($sidebarToggle = true)}
					>
						<Icon solid src={XMark} size="20" />
					</a>
				</div>
			</svelte:fragment>
		</MeasureDetailView>
	{:else if isInternalObjectiveContainer(container)}
		<InternalObjectiveDetailView {container} {relatedContainers} {revisions}>
			<svelte:fragment slot="header">
				<h2>{container.payload.title}</h2>
				<div class="icons">
					{#if $user.isAuthenticated}
						<a href="{container.guid}/edit" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<a
						href={closeOverlay()}
						class="button icons-element"
						on:click={() => ($sidebarToggle = true)}
					>
						<Icon solid src={XMark} size="20" />
					</a>
				</div>
			</svelte:fragment>
		</InternalObjectiveDetailView>
	{:else}
		<ContainerDetailView {container} {relatedContainers} {revisions}>
			<svelte:fragment slot="header">
				<h2>{container.payload.title}</h2>
				<div class="icons">
					{#if $user.isAuthenticated}
						<button class="icons-element" on:click={() => (edit = true)}>
							<Icon solid src={Pencil} size="20" />
						</button>
					{/if}
					<a
						href={closeOverlay()}
						class="button icons-element"
						on:click={() => ($sidebarToggle = true)}
					>
						<Icon solid src={XMark} size="20" />
					</a>
				</div>
			</svelte:fragment>
		</ContainerDetailView>
	{/if}
</div>

<style>
	.overlay {
		height: calc(100%);
		margin-left: -0.375rem;
		overflow-x: hidden;
		padding: 0;
		width: 100%;
	}

	.overlay > :global(*) {
		min-width: 100vw;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 80%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.8);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 65%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.65);
		}
	}
</style>
