<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import { type AnyContainer, displayName, getManagedBy, isAdminOf, isHeadOf } from '$lib/models';

	interface Props {
		container: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let { container, relatedContainers }: Props = $props();

	let managedBy = $derived(
		getManagedBy(container, [
			...page.data.organizations,
			...page.data.organizationalUnits,
			...relatedContainers
		]) as AnyContainer
	);

	let managedByGuid = $derived(managedBy.guid);

	let teamPromise = $derived(fetchMembers(managedByGuid));
</script>

<div class="label">{$_('managed_by')}</div>
<div class="value value--read-only">
	{#await teamPromise}
		&nbsp;
	{:then members}
		{@const headsOf = members
			.filter((m) => isHeadOf(m, managedBy))
			.map((m) => displayName(m))
			.join(', ')}
		{@const adminsOf = members
			.filter((m) => isAdminOf(m, managedBy))
			.map((m) => displayName(m))
			.join(', ')}
		{#if headsOf}{headsOf}{:else if adminsOf}{adminsOf}{:else}&nbsp;{/if}
	{/await}
</div>
