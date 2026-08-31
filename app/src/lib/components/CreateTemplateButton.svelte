<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Template from '~icons/knotdots/template';
	import { page } from '$app/state';
	import { type AnyPayload, type Container, containerOfType, createRootCopyOf } from '$lib/models';
	import { selectContainerCopyLocation, type ContainerCopyLocation } from '$lib/containerCopy';
	import { ability, applicationState, openContainerCopyDialog, user } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function canCreateAt(location: ContainerCopyLocation) {
		const candidate = containerOfType(
			container.payload.type,
			location.organizationGuid,
			location.organizationalUnitGuid,
			location.organizationalUnitGuid ?? location.organizationGuid,
			container.realm
		);
		return $ability.can('create', candidate);
	}

	let copyLocation = $derived.by(() =>
		selectContainerCopyLocation(
			{
				organizationGuid: page.data.currentOrganization.guid,
				organizationalUnitGuid: page.data.currentOrganizationalUnit?.guid ?? null
			},
			$user.creatableOf.find((guid) => page.data.organizations.some((o) => o.guid === guid)),
			page.data.organizations,
			page.data.organizationalUnits,
			canCreateAt
		)
	);

	function createTemplate() {
		const location = copyLocation;
		if (!location || !('template' in container.payload) || container.payload.template) {
			return;
		}

		const copy = createRootCopyOf(
			container,
			location.organizationGuid,
			location.organizationalUnitGuid,
			container.payload.visibility
		);
		if (!('template' in copy.payload)) {
			return;
		}
		copy.payload = { ...copy.payload, template: true };

		openContainerCopyDialog(copy, {
			operation: 'create-template',
			sourceGuid: container.guid,
			targetOrganizationGuid: location.organizationGuid,
			targetOrganizationalUnitGuid: location.organizationalUnitGuid
		});

		createContainerDialog.getElement().showModal();
	}
</script>

{#if $applicationState.containerDetailView.editable && 'template' in container.payload && !container.payload.template && copyLocation}
	<button class="button-template" type="button" onclick={createTemplate}>
		<Template />
		{$_('create_template')}
	</button>
{/if}
