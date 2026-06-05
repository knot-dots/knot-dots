<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import SubscribeDialog from '$lib/components/SubscribeDialog.svelte';
	import type { AnyContainer, OrganizationalUnitContainer, Relation } from '$lib/models';
	import { user } from '$lib/stores';
	import Subscribe from '~icons/knotdots/subscribe';
	import CheckCircle from '~icons/knotdots/check-circle';
	import ChevronDown from '~icons/knotdots/chevron-down';
	import { resource } from 'runed';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	let popoverOpen = $state(false);

	const subscribedPrograms = $derived((page.data.subscribedPrograms ?? []) as string[]);

	const isSubscribedFromLayout = $derived(subscribedPrograms.includes(container.guid));

	const subscriptionCheck = resource(
		() => container.guid,
		async (guid, _, { signal }) => {
			const res = await fetch(`/container/${guid}/subscription`, { signal });
			if (!res.ok) return [];
			return (await res.json()) as Relation[];
		}
	);

	const organizationalUnits = $derived(
		page.data.organizationalUnits as OrganizationalUnitContainer[]
	);

	const myOUs = $derived.by(() => {
		const guids = new Set<string>();
		if ($user.roles.includes('sysadmin')) {
			for (const ou of organizationalUnits) {
				guids.add(ou.guid);
			}
		} else {
			for (const ou of organizationalUnits) {
				if ($user.adminOf.includes(ou.guid) || $user.headOf.includes(ou.guid)) {
					guids.add(ou.guid);
				}
			}
		}
		return guids;
	});

	const currentScope = $derived.by(() => {
		const currentOU = page.data.currentOrganizationalUnit as
			| OrganizationalUnitContainer
			| undefined;
		if (currentOU) return new Set([currentOU.guid]);
		const currentOrg = page.data.currentOrganization as { guid: string } | undefined;
		if (!currentOrg) return new Set<string>();
		const ouGuids = organizationalUnits
			.filter((ou) => ou.organization === currentOrg.guid)
			.map((ou) => ou.guid);
		return new Set([currentOrg.guid, ...ouGuids]);
	});

	const isSubscribed = $derived.by(() => {
		if (isSubscribedFromLayout) return true;
		const subs = subscriptionCheck.current ?? [];
		return subs.some((r) => currentScope.has(r.subject));
	});

	const canSubscribe = $derived(
		$user.isAuthenticated &&
			myOUs.size > 0 &&
			container.payload.type === 'program' &&
			'programType' in container.payload &&
			container.payload.programType === 'program_type.set_of_rules' &&
			container.payload.visibility === 'public'
	);

	async function handleUnsubscribe() {
		const subs = subscriptionCheck.current ?? [];
		const ouGuids = subs.map((r) => r.subject).filter((guid) => currentScope.has(guid));

		if (ouGuids.length === 0) return;

		const response = await fetch(`/container/${container.guid}/subscription`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ organizations: ouGuids })
		});

		if (response.ok) {
			subscriptionCheck.refetch();
			await invalidateAll();
		}
	}

	let buttonEl = $state<HTMLButtonElement>();

	function togglePopover() {
		popoverOpen = !popoverOpen;
	}
</script>

{#if canSubscribe}
	<div class="subscribe-wrapper">
		{#if isSubscribed}
			<button class="subscribe-button is-subscribed" onclick={handleUnsubscribe}>
				<CheckCircle />
				{$_('subscribe_button.unsubscribe')}
				<ChevronDown />
			</button>
		{:else}
			<button class="subscribe-button" bind:this={buttonEl} onclick={togglePopover}>
				<Subscribe />
				{$_('subscribe_button.subscribe')}
				<ChevronDown />
			</button>
		{/if}
		<SubscribeDialog
			{container}
			bind:open={popoverOpen}
			anchor={buttonEl}
			onsubscribed={() => subscriptionCheck.refetch()}
			onclose={() => (popoverOpen = false)}
		/>
	</div>
{/if}

<style>
	.subscribe-wrapper {
		position: relative;
	}

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
