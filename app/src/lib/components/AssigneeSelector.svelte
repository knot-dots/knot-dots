<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import ListBox from '$lib/components/ListBox.svelte';
	import { type User } from '$lib/models';

	export let value: string | undefined;

	let membersPromise: Promise<User[]> = fetchMembers(
		$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
	);
</script>

{#await membersPromise}
	<ListBox label={$_('assignee')} options={[]} {value} />
{:then members}
	<ListBox
		label={$_('assignee')}
		options={members
			.filter(({ display_name }) => display_name !== '')
			.map(({ display_name, guid }) => ({ value: guid, label: display_name }))}
		bind:value
	/>
{/await}
