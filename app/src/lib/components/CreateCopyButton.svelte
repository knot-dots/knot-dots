<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CopyCat from '~icons/knotdots/copycat';
	import { page } from '$app/state';
	import { type AnyPayload, type Container, containerOfType, createRootCopyOf } from '$lib/models';
	import { selectContainerCopyLocation, type ContainerCopyLocation } from '$lib/containerCopy';
	import { ability, applicationState, newContainer, pendingContainerCopy, user } from '$lib/stores';

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
			$user.adminOf[0],
			page.data.organizations,
			page.data.organizationalUnits,
			canCreateAt
		)
	);

	async function createCopy(container: Container<AnyPayload>) {
		const location = copyLocation;
		if (!location) {
			return;
		}

		const copy = createRootCopyOf(
			container,
			location.organizationGuid,
			location.organizationalUnitGuid,
			container.payload.visibility
		);

		if ('title' in container.payload && 'title' in copy.payload) {
			copy.payload.title = $_('copy_of', {
				values: { title: container.payload.title }
			});
		}

		$newContainer = copy;
		$pendingContainerCopy = {
			operation: 'copy',
			sourceGuid: container.guid,
			targetOrganizationGuid: location.organizationGuid,
			targetOrganizationalUnitGuid: location.organizationalUnitGuid
		};

		createContainerDialog.getElement().showModal();
	}
</script>

{#if $applicationState.containerDetailView.editable && copyLocation}
	<button class="button-copycat" type="button" onclick={() => createCopy(container)}>
		<CopyCat />
		{$_('copy')}
	</button>
{/if}
