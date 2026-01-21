<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditablePlainText from '$lib/components/EditablePlainText.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { predicates, type AnyContainer, type Container, type TermContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: TermContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditablePlainText
			{editable}
			label={$_('category.terms.value_label')}
			required
			bind:value={container.payload.value}
		/>

		<EditablePlainText
			{editable}
			label={$_('category.terms.filter_label')}
			bind:value={container.payload.filterLabel}
		/>
	{/snippet}

	{#snippet general()}
		<EditablePlainText
			{editable}
			label={$_('category.terms.value_label')}
			required
			bind:value={container.payload.value}
		/>

		<EditablePlainText
			{editable}
			label={$_('category.terms.filter_label')}
			bind:value={container.payload.filterLabel}
		/>

		<label class="field">
			<EditableImage
				{editable}
				label={$_('category.terms.icon')}
				help={$_('upload.image.svg_only_help')}
				allowedFileTypes={['image/svg+xml']}
				bind:value={container.payload.icon}
			/>
		</label>

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

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
</style>
