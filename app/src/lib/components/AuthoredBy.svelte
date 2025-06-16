<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import fetchMembers from '$lib/client/fetchMembers';
	import { type AnyContainer, displayName, getCreator } from '$lib/models';

	interface Props {
		container: AnyContainer;
		revisions: AnyContainer[];
	}

	let { container, revisions }: Props = $props();

	let organization = $derived(container.organization);

	let organizationMembersPromise = $derived(fetchMembers(organization));
</script>

<div class="label">{$_('created_date')}</div>
<div class="value value--read-only">
	{#if revisions.length === 0}
		{$_('empty')}
	{:else}
		{#await organizationMembersPromise}
			{$date(revisions[0].valid_from, { format: 'long' })}
		{:then organizationMembers}
			{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
			{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
				? $_('created_by', {
						values: {
							date: revisions[0].valid_from,
							creator: getCreator(revisions[0])
								.map((guid) => organizationMembersByGuid.get(guid))
								.filter((m) => m !== undefined)
								.map((m) => displayName(m))
								.join(', ')
						}
					})
				: $date(revisions[0].valid_from, { format: 'long' })}
		{/await}
	{/if}
</div>

<div class="label">{$_('modified_date')}</div>
<div class="value value--read-only">
	{#if revisions.length === 0}
		{$_('empty')}
	{:else}
		{#await organizationMembersPromise}
			{$date(container.valid_from, { format: 'long' })}
		{:then organizationMembers}
			{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
			{getCreator(container).some((guid) => organizationMembersByGuid.has(guid))
				? $_('created_by', {
						values: {
							date: container.valid_from,
							creator: getCreator(container)
								.map((guid) => organizationMembersByGuid.get(guid))
								.filter((m) => m !== undefined)
								.map((m) => displayName(m))
								.join(', ')
						}
					})
				: $date(container.valid_from, { format: 'long' })}
		{/await}
	{/if}
</div>
