<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import EditableCustomDomain from '$lib/components/EditableCustomDomain.svelte';
	import EditableOrganizationCategory from '$lib/components/EditableOrganizationCategory.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import type { OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import { workspaceModules, workspaces } from '$lib/workspaces';

	interface Props {
		container: OrganizationContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const workspaceOptions = $derived(
		workspaceModules.flatMap((module) =>
			workspaces
				.filter((w) => w.module === module.key)
				.map((w) => ({
					value: w.key,
					label: `${$_(module.i18nKey)} \u2013 ${$_(w.i18nKey)}`
				}))
		)
	);

	// In edit mode, an empty `visibleWorkspaces` historically meant "show all".
	// Prefill with every selectable workspace so unchecking a box reliably hides
	// that workspace; without this, unchecking reads as "still empty = show all".
	$effect(() => {
		if (editable && container.payload.visibleWorkspaces.length === 0) {
			container.payload.visibleWorkspaces = workspaces.map((w) => w.key);
		}
	});
</script>

<div class="details-section">
	<div class="data-grid">
		<EditableOrganizationCategory {editable} bind:value={container.payload.organizationCategory} />

		<EditableMultipleChoice
			{editable}
			label={$_('boards')}
			options={['board.indicators', 'board.organizational_units'].map((o) => ({
				value: o,
				label: $_(o)
			}))}
			bind:value={container.payload.boards}
		/>

		{#if createFeatureDecisions(page.data.features).useMegaMenu()}
			<EditableMultipleChoice
				{editable}
				label={$_('properties.subheading.visible_workspaces')}
				options={workspaceOptions}
				bind:value={container.payload.visibleWorkspaces}
			/>
		{/if}

		{#if $ability.can('update', container, 'customDomain')}
			<EditableCustomDomain {editable} bind:value={container.payload.customDomain} />
		{/if}

		{#if $ability.can('update', container, 'visibility')}
			<EditableVisibility {editable} bind:container />
		{/if}
	</div>
</div>
