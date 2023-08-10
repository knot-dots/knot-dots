<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import MeasureForm from '$lib/components/MeasureForm.svelte';
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
		isTextContainer
	} from '$lib/models';
	import type { Container, CustomEventMap, EmptyContainer } from '$lib/models';
	import { sidebarToggle, user } from '$lib/stores';
	import { Icon, Pencil, XMark } from 'svelte-hero-icons';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import MeasureDetailView from '$lib/components/MeasureDetailView.svelte';

	export let container: Container | EmptyContainer;
	export let isPartOfOptions: Container[];
	export let relatedContainers: Container[];
	export let revisions: Container[];

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

<div class="overlay" transition:slide={{ axis: 'x' }}>
	{#if edit}
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
	{:else if 'guid' in container}
		{#if isMeasureContainer(container)}
			<MeasureDetailView {container} {relatedContainers} {revisions}>
				<svelte:fragment slot="header">
					<h2>
						{container.payload.title}
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
					</h2>
				</svelte:fragment>
			</MeasureDetailView>
		{:else}
			<ContainerDetailView {container} {relatedContainers} {revisions}>
				<svelte:fragment slot="header">
					<h2>
						{container.payload.title}
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
					</h2>
				</svelte:fragment>
			</ContainerDetailView>
		{/if}
	{/if}
</div>

<style>
	.overlay {
		height: calc(100%);
		margin-left: -0.375rem;
		overflow-x: hidden;
		padding: 0;
		position: relative;
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
