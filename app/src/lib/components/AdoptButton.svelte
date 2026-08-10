<script lang="ts">
	import { _ } from 'svelte-i18n';
	import BadgeCheck from '~icons/flowbite/badge-check-outline';
	import Bookmark from '~icons/flowbite/bookmark-outline';
	import { page } from '$app/state';
	import { adoptableOrganizationalUnits, adopters, isAdoptableProgram } from '$lib/adoptions';
	import AdoptDialog from '$lib/components/AdoptDialog.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import type { Container, ProgramPayload } from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		container: Container<ProgramPayload>;
	}

	let { container }: Props = $props();

	// svelte-ignore non_reactive_update
	let adoptDialog: HTMLDialogElement;

	const adoptableUnits = $derived(
		adoptableOrganizationalUnits($user, container, page.data.organizationalUnits)
	);

	const mayAdopt = $derived(
		createFeatureDecisions(page.data.features).useAdoptions() &&
			$user.isAuthenticated &&
			isAdoptableProgram(container) &&
			adoptableUnits.length > 0
	);

	const isAdopted = $derived.by(() => {
		const currentAdopters = adopters(container);
		return adoptableUnits.some(({ guid }) => currentAdopters.includes(guid));
	});
</script>

{#if mayAdopt}
	<button class:button-primary={!isAdopted} onclick={() => adoptDialog.showModal()} type="button">
		{#if isAdopted}
			<BadgeCheck />
			{$_('adopt.adopted')}
		{:else}
			<Bookmark />
			{$_('adopt.adopt')}
		{/if}
	</button>

	<AdoptDialog bind:dialog={adoptDialog} {container} />
{/if}
