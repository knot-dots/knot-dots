<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { onMount } from 'svelte';
	import type { User } from '$lib/models';
	import fetchMembers from '$lib/client/fetchMembers';
	import { page } from '$app/stores';

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
			.filter(({ display_name }) => display_name !== '')
			.map(({ guid, display_name }) => [display_name, guid])}
	/>
{/await}
