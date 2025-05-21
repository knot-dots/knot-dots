<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import { displayName, type User } from '$lib/models';

	let membersPromise: Promise<User[]> = new Promise(() => []);

	onMount(() => {
		membersPromise = fetchMembers(
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
		);
	});
</script>

{#await membersPromise then members}
	<FilterDropDown
		key="assignee"
		options={members
			.filter(({ family_name }) => family_name !== '')
			.map((m) => ({ count: 0, label: displayName(m), value: m.guid }))}
	/>
{/await}
