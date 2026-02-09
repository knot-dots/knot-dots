<script lang="ts">
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import EditableResourceV2 from '$lib/components/EditableResourceV2.svelte';
	import { type AnyContainer, type Container, type ResourceDataContainer } from '$lib/models';
	import EditableOrganizationalUnit from './EditableOrganizationalUnit.svelte';
	import EditableOrganization from './EditableOrganization.svelte';
	import { ability } from '$lib/stores';
	import AuthoredBy from './AuthoredBy.svelte';
	import ManagedBy from './ManagedBy.svelte';

	interface Props {
		container: ResourceDataContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableResourceV2 {editable} required bind:value={container.payload.resource} />

		<EditableOrganization
			editable={editable && $ability.can('update', container.payload.type, 'organization')}
			bind:value={container.managed_by}
		/>

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet general()}
		<EditableResourceV2 {editable} required bind:value={container.payload.resource} />
	{/snippet}

	{#snippet ownership()}
		<ManagedBy {container} {relatedContainers} />

		<EditableOrganization
			editable={editable && $ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>

		<AuthoredBy {container} {revisions} />
	{/snippet}
</PropertyGrid>
