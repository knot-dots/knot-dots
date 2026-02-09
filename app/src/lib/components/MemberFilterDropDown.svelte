<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import fetchMembers from '$lib/client/fetchMembers';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import { displayName, paramsFromFragment } from '$lib/models';
	import type { User } from '$lib/models';

	interface Props {
		options: Array<{ count: number; label: string; value: string }>;
	}

	let { options }: Props = $props();

	const overlay = getContext('overlay');

	let members: User[] = $state([]);

	onMount(async () => {
		members = await fetchMembers(
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
		);
	});
</script>

{#if options.length > 0 || (overlay && paramsFromFragment(page.url).has('member')) || (!overlay && page.url.searchParams.has('member'))}
	<FilterDropDown
		key="member"
		options={members
			.filter(({ family_name }) => family_name !== '')
			.map((m) => ({
				count: options.find(({ value }) => m.guid === value)?.count ?? 0,
				label: displayName(m),
				value: m.guid
			}))}
	/>
{/if}
