<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import {
		type AnyPayload,
		categoryObjectTypes,
		type CategoryPayload,
		type Container
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import ManagedBy from '$lib/components/ManagedBy.svelte';

	interface Props {
		container: Container<CategoryPayload>;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableMultipleChoice
			{editable}
			label={$_('payload_type')}
			options={categoryObjectTypes.options.map((value) => ({
				label: $_(value),
				value
			}))}
			bind:value={container.payload.objectTypes}
		/>
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
			options={categoryObjectTypes.options.map((value) => ({
				label: $_(value),
				value
			}))}
			bind:value={container.payload.objectTypes}
		/>
	{/snippet}
</PropertyGrid>
