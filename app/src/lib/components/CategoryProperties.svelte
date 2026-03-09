<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import {
		categoryObjectTypes,
		payloadTypes,
		type AnyContainer,
		type CategoryContainer,
		type Container
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import ManagedBy from '$lib/components/ManagedBy.svelte';

	interface Props {
		container: CategoryContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();

	const objectTypeOptions = $derived.by(() =>
		categoryObjectTypes.options.map((value) => ({
			label: $_(value),
			value
		}))
	);
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableMultipleChoice
			{editable}
			label={$_('payload_type')}
			options={objectTypeOptions}
			bind:value={container.payload.objectTypes}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}

	{#snippet ownership()}
		<ManagedBy {container} {relatedContainers} />

		<EditableOrganization
			editable={editable && $ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<AuthoredBy {container} {revisions} />
	{/snippet}

	{#snippet general()}
		<EditableMultipleChoice
			{editable}
			label={$_('payload_type')}
			options={objectTypeOptions}
			bind:value={container.payload.objectTypes}
		/>

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:value={container.payload.visibility} />
		{/if}
	{/snippet}
</PropertyGrid>
