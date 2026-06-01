<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import SubscribeDialog from '$lib/components/SubscribeDialog.svelte';
	import type { AnyContainer } from '$lib/models';
	import { user } from '$lib/stores';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	let dialog = $state<HTMLDialogElement>();

	const subscribedPrograms = $derived((page.data.subscribedPrograms ?? []) as string[]);

	const isSubscribed = $derived(subscribedPrograms.includes(container.guid));

	const isSysadmin = $derived($user.roles.includes('sysadmin'));

	const allowedOrgs = $derived.by(() => {
		const orgs = new Set([...$user.adminOf, ...$user.headOf]);
		if (isSysadmin && orgs.size === 0) {
			const currentOrg = page.data.currentOrganization;
			const currentOU = page.data.currentOrganizationalUnit;
			if (currentOU) orgs.add(currentOU.guid);
			else if (currentOrg) orgs.add(currentOrg.guid);
		}
		return orgs;
	});

	const canSubscribe = $derived(
		$user.isAuthenticated &&
			allowedOrgs.size > 0 &&
			container.payload.visibility === 'public' &&
			!allowedOrgs.has(container.organization) &&
			!(container.organizational_unit && allowedOrgs.has(container.organizational_unit))
	);

	async function handleUnsubscribe() {
		const orgGuids = [...allowedOrgs].filter(
			(guid) => guid !== container.organization && guid !== container.organizational_unit
		);

		if (orgGuids.length === 0) return;

		const response = await fetch(`/container/${container.guid}/subscription`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ organizations: orgGuids })
		});

		if (response.ok) {
			await invalidateAll();
		}
	}
</script>

{#if canSubscribe}
	{#if isSubscribed}
		<button class="button-alternative button-xs" onclick={handleUnsubscribe}>
			{$_('subscribe_button.unsubscribe')}
		</button>
	{:else}
		<button class="button-alternative button-xs" onclick={() => dialog?.showModal()}>
			{$_('subscribe_button.subscribe')}
		</button>
	{/if}
	<SubscribeDialog {container} bind:dialog />
{/if}
