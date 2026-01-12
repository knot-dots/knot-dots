<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CopyCat from '~icons/knotdots/copycat';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import { type AnyContainer, type Container, createCopyOf, type NewContainer } from '$lib/models';
	import { ability, applicationState, newContainer, user } from '$lib/stores';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	async function createCopy(container: AnyContainer) {
		const organizationalUnit = page.data.organizationalUnits.find(
			(o) => $user.adminOf[0] == o.guid
		);
		let organization;
		if (organizationalUnit) {
			organization = organizationalUnit.organization;
		} else {
			organization = page.data.organizations.find((o) => $user.adminOf[0] == o.guid)
				?.guid as string;
		}

		$newContainer = createCopyOf(
			{
				...container,
				payload: {
					...container.payload,
					...('title' in container.payload
						? {
								title: $_('copy_of', {
									values: { title: container.payload.title }
								})
							}
						: undefined)
				}
			} as Container,
			organization,
			organizationalUnit?.guid ?? null
		) as NewContainer;

		createContainerDialog.getElement().showModal();
	}
</script>

{#if $applicationState.containerDetailView.editable && $user.adminOf.length > 0 && $ability.can('create', container.payload.type)}
	<button
		class="button-copycat"
		type="button"
		onclick={() => createCopy(container)}
		{@attach tooltip($_('copy'))}
	>
		<CopyCat />
		{$_('copy')}
	</button>
{/if}
