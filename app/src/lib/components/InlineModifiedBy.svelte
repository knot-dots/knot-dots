<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import CalendarEdit from '~icons/flowbite/calendar-edit-solid';
	import tooltip from '$lib/attachments/tooltip';
	import fetchMembers from '$lib/client/fetchMembers';
	import { type AnyPayload, type Container, displayName, getCreator } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container }: Props = $props();

	let organization = $derived(container.organization);

	let organizationMembersPromise = $derived(fetchMembers(organization));
</script>

<span {@attach tooltip($_('modified_date'))} class="badge badge--large badge--unstyled">
	<CalendarEdit />
	{#await organizationMembersPromise}
		{$date(container.valid_from, { format: 'short' })}
	{:then organizationMembers}
		{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
		{getCreator(container).some((guid) => organizationMembersByGuid.has(guid))
			? $_('created_by_inline', {
					values: {
						date: container.valid_from,
						creator: getCreator(container)
							.map((guid) => organizationMembersByGuid.get(guid))
							.filter((m) => m !== undefined)
							.map((m) => displayName(m))
							.join(', ')
					}
				})
			: $date(container.valid_from, { format: 'short' })}
	{/await}
</span>

<style>
	.badge.badge--unstyled {
		background: transparent;
		border: none;
	}
</style>
