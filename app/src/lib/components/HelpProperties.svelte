<script lang="ts">
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import EditableHelpSlug from '$lib/components/EditableHelpSlug.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type Container, type HelpContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: HelpContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		{#if $ability.can('update', container, 'slug')}
			<EditableHelpSlug {editable} bind:value={container.payload.slug} />
		{/if}
	{/snippet}

	{#snippet general()}
		{#if $ability.can('update', container, 'slug')}
			<EditableHelpSlug {editable} bind:value={container.payload.slug} />
		{/if}

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:container {relatedContainers} />
		{/if}
	{/snippet}

	{#snippet categories()}
		<EditableCategories bind:container {editable} organizationGuid={container.organization} />
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
