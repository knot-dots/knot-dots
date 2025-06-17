<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import type { AnyContainer, PageContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: PageContainer;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), revisions }: Props = $props();
</script>

<EditableContainerDetailView bind:container relatedContainers={[]} {revisions}>
	{#snippet data()}
		<PropertyGrid>
			{#snippet bottom()}
				{#if $ability.can('update', container, 'visibility')}
					<EditableVisibility
						editable={$applicationState.containerDetailView.editable}
						bind:value={container.payload.visibility}
					/>
				{/if}

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
				label={$_('body')}
				bind:value={container.payload.body}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>
