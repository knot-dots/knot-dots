<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import { type AnyContainer, type Container, type ResourceContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: ResourceContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let timer: ReturnType<typeof setTimeout>;

	function debouncedSubmit(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			input.closest('form')?.requestSubmit();
		}, 2000);
	}
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions} tabs={['basic-data']}>
	<svelte:fragment slot="data">
		{#if $applicationState.containerDetailView.editable}
			<label class="label" for="amount">
				{$_('amount')}
			</label>
			<input
				class="value"
				id="amount"
				inputmode="numeric"
				name="amount"
				onchange={debouncedSubmit}
				type="text"
				bind:value={container.payload.amount}
			/>
		{:else}
			<span class="label">{$_('amount')}</span>
			<span class="value">
				{container.payload.amount ? $number(container.payload.amount) : $_('empty')}
			</span>
		{/if}

		{#if $applicationState.containerDetailView.editable}
			<label class="label" for="unit">
				{$_('unit')}
			</label>
			<input
				class="value"
				id="unit"
				inputmode="numeric"
				name="amount"
				onchange={debouncedSubmit}
				type="text"
				bind:value={container.payload.unit}
			/>
		{:else}
			<span class="label">{$_('unit')}</span>
			<span class="value">{container.payload.unit ?? $_('empty')}</span>
		{/if}

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>
	</svelte:fragment>
</EditableContainerDetailView>

<style>
	input {
		border: none;
		line-height: 1.5;
	}
</style>
