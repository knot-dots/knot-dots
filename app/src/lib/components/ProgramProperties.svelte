<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableChapterType from '$lib/components/EditableChapterType.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableImage from '$lib/components/EditableImage.svelte';
	import EditableLevel from '$lib/components/EditableLevel.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditablePDF from '$lib/components/EditablePDF.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableProgramStatus from '$lib/components/EditableProgramStatus.svelte';
	import EditableProgramType from '$lib/components/EditableProgramType.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type Container, type ProgramContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: ProgramContainer;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

<PropertyGrid>
	{#snippet top()}
		<EditableImage {editable} label={$_('cover')} bind:value={container.payload.image} />

		<EditablePDF {editable} bind:value={container.payload.pdf} />

		<EditableCategory {editable} bind:value={container.payload.category} />

		<EditableOrganizationalUnit
			editable={editable && $ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	{/snippet}

	{#snippet general()}
		<EditableImage {editable} label={$_('cover')} bind:value={container.payload.image} />

		<EditablePDF {editable} bind:value={container.payload.pdf} />

		<EditableProgramType {editable} bind:value={container.payload.programType} />

		<EditableChapterType {editable} bind:value={container.payload.chapterType} />

		<EditableLevel {editable} bind:value={container.payload.level} />

		<EditableProgramStatus {editable} bind:value={container.payload.programStatus} />

		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				editable={editable && $ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		<EditableVisibility {editable} bind:value={container.payload.visibility} />
	{/snippet}

	{#snippet categories()}
		<EditableCategory {editable} bind:value={container.payload.category} />

		<EditableTopic {editable} bind:value={container.payload.topic} />

		<EditablePolicyFieldBNK {editable} bind:value={container.payload.policyFieldBNK} />

		<EditableAudience {editable} bind:value={container.payload.audience} />
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
