<script lang="ts">
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import { displayName, isTeamContainer } from '$lib/models';

	interface Props {
		options: Array<{ count: number; label: string; value: string }>;
	}

	let { options }: Props = $props();

	let membersPromise = fetchMembers(
		page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
	);

	// tasks can be assigned to the teams of the organization as well
	const teamOptions = $derived(
		page.data.organizationalUnits
			.filter(isTeamContainer)
			.filter((team) => team.organization === page.data.currentOrganization.guid)
			.map((team) => ({
				count: options.find(({ value }) => team.guid === value)?.count ?? 0,
				label: team.payload.name,
				value: team.guid
			}))
	);
</script>

{#await membersPromise}
	<FilterDropDown key="assignee" {options} />
{:then members}
	<FilterDropDown
		key="assignee"
		options={[
			...teamOptions,
			...members
				.filter(({ family_name }) => family_name !== '')
				.map((m) => ({
					count: options.find(({ value }) => m.guid === value)?.count ?? 0,
					label: displayName(m),
					value: m.guid
				}))
		]}
	/>
{/await}
