<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import SubscribeDialog from '$lib/components/SubscribeDialog.svelte';
	import type { AnyContainer } from '$lib/models';
	import { user } from '$lib/stores';
	import Subscribe from '~icons/knotdots/subscribe';
	import CheckCircle from '~icons/knotdots/check-circle';
	import ChevronDown from '~icons/knotdots/chevron-down';
	import { resource } from 'runed';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let refetchTrigger = $state(0);

	const subscribedPrograms = $derived((page.data.subscribedPrograms ?? []) as string[]);

	const isSubscribedFromLayout = $derived(subscribedPrograms.includes(container.guid));

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

	const subscriptionCheck = resource(
		() => [container.guid, refetchTrigger] as const,
		async ([guid], _, { signal }) => {
			const res = await fetch(`/container/${guid}/subscription`, { signal });
			if (!res.ok) return [];
			return (await res.json()) as Array<{ subject: string }>;
		}
	);

	const isSubscribed = $derived(
		isSubscribedFromLayout ||
			(subscriptionCheck.current ?? []).some((r) => allowedOrgs.has(r.subject))
	);

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
			refetchTrigger++;
			await invalidateAll();
		}
	}
</script>

{#if canSubscribe}
	{#if isSubscribed}
		<button class="subscribe-button is-subscribed" onclick={handleUnsubscribe}>
			<CheckCircle />
			{$_('subscribe_button.unsubscribe')}
			<ChevronDown />
		</button>
	{:else}
		<button class="subscribe-button" onclick={() => dialog?.showModal()}>
			<Subscribe />
			{$_('subscribe_button.subscribe')}
			<ChevronDown />
		</button>
	{/if}
	<SubscribeDialog {container} bind:dialog onsubscribed={() => refetchTrigger++} />
{/if}

<style>
	.subscribe-button {
		align-items: center;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: var(--color-primary-700);
		cursor: pointer;
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		white-space: nowrap;
	}

	.subscribe-button:hover {
		background: var(--color-primary-100);
	}

	.subscribe-button.is-subscribed {
		background: rgba(18, 183, 106, 0.15);
		color: #027a48;
	}

	.subscribe-button.is-subscribed:hover {
		background: rgba(18, 183, 106, 0.25);
	}

	.subscribe-button :global(svg) {
		height: 1.25rem;
		width: 1.25rem;
	}

	.subscribe-button :global(svg:last-child) {
		height: 0.875rem;
		width: 0.875rem;
	}
</style>
