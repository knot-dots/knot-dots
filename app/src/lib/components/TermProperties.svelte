<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyPayload, type Container, type TermPayload } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<TermPayload>;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditablePlainText
			{editable}
			label={$_('category.terms.filter_label')}
			bind:value={container.payload.filterLabel}
		/>
	{/snippet}

	{#snippet general()}
		<EditablePlainText
			{editable}
			label={$_('category.terms.filter_label')}
			bind:value={container.payload.filterLabel}
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
</PropertyGrid>

<style>
	:global(input[type='file'].is-visually-hidden) {
		width: 1px;
		max-width: 1px;
	}
</style>
