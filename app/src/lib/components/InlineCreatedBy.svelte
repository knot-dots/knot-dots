<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import CalendarPlus from '~icons/flowbite/calendar-plus-outline';
	import tooltip from '$lib/attachments/tooltip';
	import fetchMembers from '$lib/client/fetchMembers';
	import { type AnyPayload, type Container, displayName, getCreator } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		revisions: Array<Container<AnyPayload>>;
	}

	let { container, revisions }: Props = $props();

	let organization = $derived(container.organization);

	let organizationMembersPromise = $derived(fetchMembers(organization));
</script>

<span {@attach tooltip($_('created_date'))} class="badge badge--large badge--unstyled">
	<CalendarPlus />
	{#if revisions.length === 0}
		{$_('empty')}
	{:else}
		{#await organizationMembersPromise}
			{$date(revisions[0].valid_from, { format: 'short' })}
		{:then organizationMembers}
			{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
			{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
				? $_('created_by_inline', {
						values: {
							date: revisions[0].valid_from,
							creator: getCreator(revisions[0])
								.map((guid) => organizationMembersByGuid.get(guid))
								.filter((m) => m !== undefined)
								.map((m) => displayName(m))
								.join(', ')
						}
					})
				: $date(revisions[0].valid_from, { format: 'short' })}
		{/await}
	{/if}
</span>

<style>
	.badge.badge--unstyled {
		background: transparent;
		border: none;
	}
</style>
