<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAmount from '$lib/components/EditableAmount.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableUnit from '$lib/components/EditableUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type Container, type ResourceContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ResourceContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableAmount {editable} bind:value={container.payload.amount} />

		<EditableUnit {editable} bind:value={container.payload.unit} />

		<EditableDate
			{editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>
	{/snippet}

	{#snippet bottom()}
		<EditableAmount {editable} bind:value={container.payload.amount} />

		<EditableUnit {editable} bind:value={container.payload.unit} />

		<EditableDate
			{editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}

		<ManagedBy {container} {relatedContainers} />

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>

		<EditableOrganization
			editable={editable && $ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
