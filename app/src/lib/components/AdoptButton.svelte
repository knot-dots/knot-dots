<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import AdoptDialog from '$lib/components/AdoptDialog.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import type { AnyContainer, OrganizationalUnitContainer, Relation } from '$lib/models';
	import { user } from '$lib/stores';
	import Subscribe from '~icons/knotdots/subscribe';
	import CheckCircle from '~icons/knotdots/check-circle';
	import ChevronDown from '~icons/knotdots/chevron-down';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	let popoverOpen = $state(false);

	const subscribedPrograms = $derived((page.data.subscribedPrograms ?? []) as string[]);

	const isSubscribedFromLayout = $derived(subscribedPrograms.includes(container.guid));

	const subscriptionRelations = $derived.by(() => {
		return container.relation.filter(
			(r: Relation) => r.object === container.guid && r.predicate === 'is-subscribed-to'
		);
	});

	const organizationalUnits = $derived(
		page.data.organizationalUnits as OrganizationalUnitContainer[]
	);

	const myOrganizationalUnitGuids = $derived.by(() => {
		const organizationalUnitGuids = new Set<string>();
		if ($user.roles.includes('sysadmin')) {
			for (const organizationalUnit of organizationalUnits) {
				organizationalUnitGuids.add(organizationalUnit.guid);
			}
		} else {
			for (const organizationalUnit of organizationalUnits) {
				if (
					$user.adminOf.includes(organizationalUnit.guid) ||
					$user.headOf.includes(organizationalUnit.guid)
				) {
					organizationalUnitGuids.add(organizationalUnit.guid);
				}
			}
		}
		return organizationalUnitGuids;
	});

	const currentScope = $derived.by(() => {
		const currentOrganizationalUnit = page.data.currentOrganizationalUnit as
			| OrganizationalUnitContainer
			| undefined;
		if (currentOrganizationalUnit) return new Set([currentOrganizationalUnit.guid]);
		const currentOrg = page.data.currentOrganization as { guid: string } | undefined;
		if (!currentOrg) return new Set<string>();
		const organizationalUnitGuids = organizationalUnits
			.filter((organizationalUnit) => organizationalUnit.organization === currentOrg.guid)
			.map((organizationalUnit) => organizationalUnit.guid);
		return new Set([currentOrg.guid, ...organizationalUnitGuids]);
	});

	const isSubscribed = $derived.by(() => {
		if (isSubscribedFromLayout) return true;
		return subscriptionRelations.some((r: Relation) => currentScope.has(r.subject));
	});

	const canSubscribe = $derived(
		createFeatureDecisions(page.data.features).useSubscriptions() &&
			$user.isAuthenticated &&
			myOrganizationalUnitGuids.size > 0 &&
			container.payload.type === 'program' &&
			'programType' in container.payload &&
			container.payload.programType === 'program_type.set_of_rules' &&
			container.payload.visibility === 'public'
	);

	async function handleUnsubscribe() {
		const organizationalUnitGuids = subscriptionRelations
			.map((r: Relation) => r.subject)
			.filter((guid: string) => currentScope.has(guid));

		if (organizationalUnitGuids.length === 0) return;

		const relations = organizationalUnitGuids.map((organizationalUnitGuid: string) => ({
			object: container.guid,
			position: 0,
			predicate: 'is-subscribed-to',
			subject: organizationalUnitGuid
		}));

		const response = await fetch(`/container/${container.guid}/relation`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(relations)
		});

		if (response.ok) {
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
		<AdoptDialog
			{container}
			bind:open={popoverOpen}
			anchor={buttonEl}
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
