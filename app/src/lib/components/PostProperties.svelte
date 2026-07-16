<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableDatetime from '$lib/components/EditableDatetime.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import EditableCategories from '$lib/components/EditableCategories.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyPayload, type Container, type PostPayload } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<PostPayload>;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableDatetime
			bind:value={container.payload.publicationDate}
			{editable}
			label={$_('publication_date')}
		/>
	{/snippet}

	{#snippet general()}
		<EditableDatetime
			bind:value={container.payload.publicationDate}
			{editable}
			label={$_('publication_date')}
		/>

		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		{#if $ability.can('update', container, 'payload.visibility')}
			<EditableVisibility {editable} bind:container {relatedContainers} />
		{/if}
	{/snippet}

	{#snippet categories()}
		<EditableCategories bind:container {editable} />
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
