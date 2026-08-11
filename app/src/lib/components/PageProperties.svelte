<script lang="ts">
	import { page } from '$app/state';
	import AuthoredBy from '$lib/components/AuthoredBy.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import ManagedBy from '$lib/components/ManagedBy.svelte';
	import PropertyGrid from '$lib/components/PropertyGrid.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { type AnyPayload, type Container, type PagePayload } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: Container<PagePayload>;
		editable?: boolean;
		relatedContainers: Container[];
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), editable = false, relatedContainers, revisions }: Props = $props();
</script>

{#snippet general()}
	{#if $ability.can('update', container, 'payload.visibility')}
		<EditableVisibility {editable} bind:container {relatedContainers} />
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

{#if createFeatureDecisions(page.data.features).useNewPropertyPanel()}
	<PropertyGrid {general} {ownership} />
{:else}
	<div class="details-section">
		<div class="data-grid">
			{@render general()}
			{@render ownership()}
		</div>
	</div>
{/if}
