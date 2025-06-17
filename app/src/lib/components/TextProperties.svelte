<script lang="ts">
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type Container, type TextContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: TextContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<AuthoredBy {container} {revisions} />
	{/snippet}

	{#snippet general()}
		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet ownership()}
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
