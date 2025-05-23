<script lang="ts">
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import { displayName } from '$lib/models';

	interface Props {
		options: Array<{ count: number; label: string; value: string }>;
	}

	let { options }: Props = $props();

	let membersPromise = fetchMembers(
		page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
	);
</script>

{#await membersPromise}
	<FilterDropDown key="assignee" {options} />
{:then members}
	<FilterDropDown
		key="assignee"
		options={members
			.filter(({ family_name }) => family_name !== '')
			.map((m) => ({
				count: options.find(({ value }) => m.guid === value)?.count ?? 0,
				label: displayName(m),
				value: m.guid
			}))}
	/>
{/await}
