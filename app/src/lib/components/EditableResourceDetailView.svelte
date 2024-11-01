<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import { type AnyContainer, type Container, type ResourceContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: ResourceContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions} tabs={['basic-data']}>
	<svelte:fragment slot="data">
		<p class="tabular">
			{#if $applicationState.containerDetailView.editable}
				<label for="amount">
					{$_('amount')}
				</label>
				<span>
					<input
						id="amount"
						type="text"
						inputmode="numeric"
						name="amount"
						bind:value={container.payload.amount}
						required
					/>
				</span>
			{:else}
				<span class="label">{$_('amount')}</span>
				<span class="value">{$number(container.payload.amount ?? '')}</span>
			{/if}
		</p>

		<p class="tabular">
			{#if $applicationState.containerDetailView.editable}
				<label for="unit">
					{$_('unit')}
				</label>
				<span>
					<input
						id="unit"
						type="text"
						inputmode="numeric"
						name="amount"
						bind:value={container.payload.unit}
						required
					/>
				</span>
			{:else}
				<span class="label">{$_('unit')}</span>
				<span class="value">{container.payload.unit ?? ''}</span>
			{/if}
		</p>

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>
	</svelte:fragment>
</EditableContainerDetailView>

<style>
	p {
		height: calc(1.5rem + 1.2rem);
		padding: 0 1rem;
	}

	input {
		border: none;
		display: inline;
		width: auto;
	}

	.value {
		display: inline-block;
		line-height: 1.2;
		height: calc(1.2rem + 1.5rem);
		padding: 0.75rem 1rem;
		vertical-align: middle;
	}
</style>
