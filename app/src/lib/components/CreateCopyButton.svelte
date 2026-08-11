<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CopyCat from '~icons/knotdots/copycat';
	import { page } from '$app/state';
	import {
		type AnyPayload,
		type Container,
		createRootCopyOf,
		createTemplateInstanceOf
	} from '$lib/models';
	import { ability, applicationState, newContainer, user } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	async function createCopy(container: Container<AnyPayload>) {
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

		const copy =
			'template' in container.payload && container.payload.template
				? createTemplateInstanceOf(container, organization, organizationalUnit?.guid ?? null)
				: createRootCopyOf(
						container,
						organization,
						organizationalUnit?.guid ?? null,
						container.payload.visibility
					);

		if ('title' in container.payload && 'title' in copy.payload) {
			copy.payload.title = $_('copy_of', {
				values: { title: container.payload.title }
			});
		}

		$newContainer = copy;

		createContainerDialog.getElement().showModal();
	}
</script>

{#if $applicationState.containerDetailView.editable && $user.adminOf.length > 0 && $ability.can('create', container.payload.type)}
	<button class="button-copycat" type="button" onclick={() => createCopy(container)}>
		<CopyCat />
		{$_('copy')}
	</button>
{/if}
