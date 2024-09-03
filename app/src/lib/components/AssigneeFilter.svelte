<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import Filter from '$lib/components/Filter.svelte';
	import { displayName, type User } from '$lib/models';

	let membersPromise: Promise<User[]> = new Promise(() => []);

	onMount(() => {
		membersPromise = fetchMembers(
			$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
		);
	});
</script>

{#await membersPromise then members}
	<Filter
		key="assignee"
		label={$_('assignee')}
		options={members
			.filter(({ family_name }) => family_name !== '')
			.map((m) => [displayName(m), m.guid])}
	/>
{/await}
