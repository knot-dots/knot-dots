<script lang="ts">
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import ModelForm from '$lib/components/ModelForm.svelte';
	import OperationalGoalForm from '$lib/components/OperationalGoalForm.svelte';
	import StrategicGoalForm from '$lib/components/StrategicGoalForm.svelte';
	import StrategyForm from '$lib/components/StrategyForm.svelte';
	import TextForm from '$lib/components/TextForm.svelte';
	import {
		isEmptyMeasureContainer,
		isEmptyModelContainer,
		isEmptyOperationalGoalContainer,
		isEmptyStrategicGoalContainer,
		isEmptyTextContainer,
		isMeasureContainer,
		isModelContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		isStrategyContainer,
		isTextContainer,
		payloadTypes
	} from '$lib/models';
	import type { AnyContainer, Container, CustomEventMap, EmptyContainer } from '$lib/models';
	import { ability, sidebarToggle } from '$lib/stores';

	export let container: Container | EmptyContainer;
	export let isPartOfOptions: AnyContainer[];
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: edit = $page.url.searchParams.has('overlay-new') || $page.url.searchParams.has('edit');

	function closeOverlay() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		query.delete('edit');
		query.delete('overlay-new');
		query.delete('status');
		query.delete('is-part-of');
		return `?${query.toString()}`;
	}

	async function afterSubmit(event: CustomEvent<CustomEventMap['submitSuccessful']>) {
		if ('guid' in container) {
			await invalidateAll();
			edit = false;
		} else {
			await goto(`?container-preview=${event.detail.result.guid}`, { invalidateAll: true });
			edit = false;
		}
	}

	async function afterDelete() {
		await goto(closeOverlay(), { invalidateAll: true });
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
			{#if 'guid' in container}
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
					<StrategyForm
						{container}
						on:submitSuccessful={afterSubmit}
						on:deleteSuccessful={() => goto('/')}
					>
						<svelte:fragment slot="extra-buttons">
							<a class="button" href={closeOverlay()}>{$_('cancel')}</a>
						</svelte:fragment>
					</StrategyForm>
				{:else if isTextContainer(container)}
					<TextForm
						{container}
						{isPartOfOptions}
						on:submitSuccessful={afterSubmit}
						on:deleteSuccessful={afterDelete}
					>
						<svelte:fragment slot="extra-buttons">
							<button type="button" on:click={() => (edit = false)}>{$_('cancel')}</button>
						</svelte:fragment>
					</TextForm>
				{/if}
			{:else if isEmptyMeasureContainer(container)}
				<MeasureForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
					<svelte:fragment slot="extra-buttons">
						<a class="button" href={closeOverlay()}>{$_('cancel')}</a>
					</svelte:fragment>
				</MeasureForm>
			{:else if isEmptyModelContainer(container)}
				<ModelForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
					<svelte:fragment slot="extra-buttons">
						<a class="button" href={closeOverlay()}>{$_('cancel')}</a>
					</svelte:fragment>
				</ModelForm>
			{:else if isEmptyOperationalGoalContainer(container)}
				<OperationalGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
					<svelte:fragment slot="extra-buttons">
						<a class="button" href={closeOverlay()}>{$_('cancel')}</a>
					</svelte:fragment>
				</OperationalGoalForm>
			{:else if isEmptyStrategicGoalContainer(container)}
				<StrategicGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
					<svelte:fragment slot="extra-buttons">
						<a class="button" href={closeOverlay()}>{$_('cancel')}</a>
					</svelte:fragment>
				</StrategicGoalForm>
			{:else if isEmptyTextContainer(container)}
				<TextForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
					<svelte:fragment slot="extra-buttons">
						<a class="button" href={closeOverlay()}>{$_('cancel')}</a>
					</svelte:fragment>
				</TextForm>
			{/if}
		</div>
	{:else if 'guid' in container}
		<header class="content-header">
			<h2>
				{container.payload.title}
				<span class="icons">
					{#if $ability.can('update', $page.data.container)}
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
				</span>
			</h2>
			{#if isMeasureContainer(container)}
				<MeasureTabs {container} {revisions} />
			{/if}
		</header>
		<div class="content-details">
			{#if isMeasureContainer(container)}
				<MeasureDetailView {container} {relatedContainers} {revisions} />
			{:else}
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
			min-width: calc((100vw - 18rem) * 0.65 - 2px);
		}
	}
</style>
