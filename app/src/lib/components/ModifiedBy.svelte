<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import fetchMembers from '$lib/client/fetchMembers';
	import { type AnyPayload, type Container, displayName, getCreator } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
	}

	let { container }: Props = $props();

	let organization = $derived(container.organization);

	let organizationMembersPromise = $derived(fetchMembers(organization));
</script>

<div class="label">{$_('modified_date')}</div>
<div class="value value--read-only">
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
</div>
