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

	export let container: Container | EmptyContainer;

	export let isPartOfOptions: Container[];

	async function afterSubmit(event: CustomEvent<CustomEventMap['submitSuccessful']>) {
		if ('guid' in container) {
			await invalidateAll();
		} else {
			await goto(`?edit=${event.detail.result.guid}`, { invalidateAll: true });
		}
	}
</script>

<div class="overlay" transition:slide={{ axis: 'x' }}>
	{#if 'guid' in container}
		{#if isMeasureContainer(container)}
			<MeasureForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
				</svelte:fragment>
			</MeasureForm>
		{:else if isModelContainer(container)}
			<ModelForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
				</svelte:fragment>
			</ModelForm>
		{:else if isOperationalGoalContainer(container)}
			<OperationalGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
				</svelte:fragment>
			</OperationalGoalForm>
		{:else if isStrategicGoalGoalContainer(container)}
			<StrategicGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
				</svelte:fragment>
			</StrategicGoalForm>
		{:else if isStrategyContainer(container)}
			<StrategyForm {container} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
				</svelte:fragment>
			</StrategyForm>
		{:else if isTextContainer(container)}
			<TextForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
				<svelte:fragment slot="extra-buttons">
					<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
				</svelte:fragment>
			</TextForm>
		{/if}
	{:else if isEmptyMeasureContainer(container)}
		<MeasureForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
			<svelte:fragment slot="extra-buttons">
				<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
			</svelte:fragment>
		</MeasureForm>
	{:else if isEmptyModelContainer(container)}
		<ModelForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
			<svelte:fragment slot="extra-buttons">
				<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
			</svelte:fragment>
		</ModelForm>
	{:else if isEmptyOperationalGoalContainer(container)}
		<OperationalGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
			<svelte:fragment slot="extra-buttons">
				<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
			</svelte:fragment>
		</OperationalGoalForm>
	{:else if isEmptyStrategicGoalContainer(container)}
		<StrategicGoalForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
			<svelte:fragment slot="extra-buttons">
				<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
			</svelte:fragment>
		</StrategicGoalForm>
	{:else if isEmptyTextContainer(container)}
		<TextForm {container} {isPartOfOptions} on:submitSuccessful={afterSubmit}>
			<svelte:fragment slot="extra-buttons">
				<a class="button" href={$page.url.pathname}>{$_('cancel')}</a>
			</svelte:fragment>
		</TextForm>
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
		padding: 1rem;
	}

	@media (min-width: 768px) {
		.overlay {
			width: 50%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.5);
		}
	}

	@media (min-width: 1440px) {
		.overlay {
			width: 40%;
		}

		.overlay > :global(*) {
			min-width: calc((100vw - 18rem) * 0.4);
		}
	}
</style>
