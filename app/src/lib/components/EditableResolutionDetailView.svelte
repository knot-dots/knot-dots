<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableEditorialState from '$lib/components/EditableEditorialState.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditablePolicyFieldBNK from '$lib/components/EditablePolicyFieldBNK.svelte';
	import EditableResolutionStatus from '$lib/components/EditableResolutionStatus.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import EditableValidFrom from '$lib/components/EditableValidFrom.svelte';
	import { type AnyContainer, type Container, type ResolutionContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: ResolutionContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if $ability.can('read', container, 'payload.editorialState')}
			<EditableEditorialState
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container, 'payload.editorialState')}
				bind:value={container.payload.editorialState}
			/>
		{/if}

		<EditableValidFrom editable bind:container />

		<EditableResolutionStatus
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.resolutionStatus}
		/>

		<EditableStrategy editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableTopic
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.topic}
		/>

		<EditablePolicyFieldBNK
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.policyFieldBNK}
		/>

		<EditableCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.category}
		/>

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		<EditableOrganization
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<EditableOrganizationalUnit
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	</svelte:fragment>

	<svelte:fragment slot="extra">
		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	</svelte:fragment>
</EditableContainerDetailView>
