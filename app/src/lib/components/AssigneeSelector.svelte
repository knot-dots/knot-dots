<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import ListBox from '$lib/components/ListBox.svelte';
	import { displayName, type User } from '$lib/models';

	export let value: string | undefined;

	let membersPromise: Promise<User[]> = fetchMembers(
		$page.data.currentOrganizationalUnit?.guid ?? $page.data.currentOrganization.guid
	);
</script>

<div class="meta">
	<p class="meta-key">{$_('assignee')}</p>
	<div class="meta-value">
		{#await membersPromise}
			<ListBox label={$_('assignee')} options={[]} {value} />
		{:then members}
			<ListBox
				label={$_('assignee')}
				options={members
					.filter(({ family_name }) => family_name !== '')
					.map((m) => ({ value: m.guid, label: displayName(m) }))}
				bind:value
			/>
		{/await}
	</div>
</div>
