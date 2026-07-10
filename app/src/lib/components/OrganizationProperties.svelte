<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableCustomDomain from '$lib/components/EditableCustomDomain.svelte';
	import EditableCustomFavicon from '$lib/components/EditableCustomFavicon.svelte';
	import EditableOrganizationCategory from '$lib/components/EditableOrganizationCategory.svelte';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import EditableVisibility from '$lib/components/EditableVisibility.svelte';
	import type { Container, OrganizationPayload } from '$lib/models';
	import { ability } from '$lib/stores';
	import { workspaceModules, workspaces } from '$lib/workspaces';

	interface Props {
		container: Container<OrganizationPayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	const selectableWorkspaces = $derived(
		container.payload.default ? workspaces : workspaces.filter((w) => w.key !== 'help')
	);

	const selectableWorkspaceKeys = $derived(selectableWorkspaces.map((w) => w.key));

	const workspaceOptions = $derived(
		workspaceModules.flatMap((module) =>
			selectableWorkspaces
				.filter((w) => w.module === module.key)
				.map((w) => ({
					value: w.key,
					label: `${$_(`workspace.module.${module.key}`)} \u2013 ${$_(`workspace.${w.key}.title`)}`
				}))
		)
	);

	// In edit mode, an empty `visibleWorkspaces` historically meant "show all".
	// Prefill with every selectable workspace so unchecking a box reliably hides
	// that workspace; without this, unchecking reads as "still empty = show all".
	$effect(() => {
		if (!editable) {
			return;
		}

		if (container.payload.visibleWorkspaces.length === 0) {
			container.payload.visibleWorkspaces = [...selectableWorkspaceKeys];
		}
	});
</script>

<div class="details-section">
	<div class="data-grid">
		<EditableOrganizationCategory {editable} bind:value={container.payload.organizationCategory} />

		<EditableMultipleChoice
			{editable}
			label={$_('properties.subheading.visible_workspaces')}
			options={workspaceOptions}
			bind:value={container.payload.visibleWorkspaces}
		/>

		{#if $ability.can('update', container, 'payload.customDomain')}
			<EditableCustomDomain {editable} bind:value={container.payload.customDomain} />
		{/if}

		{#if $ability.can('update', container, 'payload.customFavicon')}
			<EditableCustomFavicon {editable} bind:value={container.payload.customFavicon} />
		{/if}

		{#if $ability.can('update', container, 'payload.visibility')}
			<EditableVisibility {editable} bind:container />
		{/if}
	</div>
</div>
