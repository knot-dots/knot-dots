<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAmount from '$lib/components/EditableAmount.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableUnit from '$lib/components/EditableUnit.svelte';
	import { type AnyContainer, type Container, type ResourceContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: ResourceContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<EditableAmount
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.amount}
		/>

		<EditableUnit
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.unit}
		/>

		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>
	{/snippet}
</EditableContainerDetailView>
