<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
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
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { type AnyContainer, type Container, type ResolutionContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: ResolutionContainer;
		relatedContainers: Container[];
		revisions: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<PropertyGrid>
			{#snippet top()}
				<EditableResolutionStatus
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.resolutionStatus}
				/>

				<EditableValidFrom editable bind:container />

				<ManagedBy {container} {relatedContainers} />

				<EditableOrganizationalUnit
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organizational_unit')}
					organization={container.organization}
					bind:value={container.organizational_unit}
				/>
			{/snippet}

			{#snippet bottom()}
				<EditableResolutionStatus
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.resolutionStatus}
				/>

				{#if $ability.can('read', container, 'payload.editorialState')}
					<EditableEditorialState
						editable={$applicationState.containerDetailView.editable &&
							$ability.can('update', container, 'payload.editorialState')}
						bind:value={container.payload.editorialState}
					/>
				{/if}

				<EditableValidFrom editable bind:container />

				<EditableStrategy
					editable={$applicationState.containerDetailView.editable}
					bind:container
				/>

				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.visibility}
					/>
				{/if}

				<EditableCategory
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.category}
				/>

				<EditableTopic
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.topic}
				/>

				<EditablePolicyFieldBNK
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.policyFieldBNK}
				/>

				<EditableAudience
					editable={$applicationState.containerDetailView.editable}
					bind:value={container.payload.audience}
				/>

				<ManagedBy {container} {relatedContainers} />

				<EditableOrganizationalUnit
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organizational_unit')}
					organization={container.organization}
					bind:value={container.organizational_unit}
				/>

				<EditableOrganization
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container.payload.type, 'organization')}
					bind:value={container.organization}
				/>

				<AuthoredBy {container} {revisions} />
			{/snippet}
		</PropertyGrid>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>
