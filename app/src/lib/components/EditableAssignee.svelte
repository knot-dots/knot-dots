<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { displayName, isTeamContainer, type User } from '$lib/models';

	interface Props {
		candidatesPromise: Promise<User[]>;
		editable: boolean;
		// the organization whose teams can be assigned besides the members
		organization: string;
		value: string[];
	}

	let { candidatesPromise, editable = false, organization, value = $bindable() }: Props = $props();

	// teams only mean something while the permission matrix is on
	const teamOptions = $derived(
		createFeatureDecisions(page.data.features).usePermissionMatrix()
			? page.data.organizationalUnits
					.filter(isTeamContainer)
					.filter((team) => team.organization === organization)
					.map((team) => ({ value: team.guid, label: team.payload.name }))
			: []
	);
</script>

{#await candidatesPromise}
	<EditableMultipleChoice {editable} label={$_('assignee')} options={teamOptions} value={[]} />
{:then candidates}
	<EditableMultipleChoice
		{editable}
		label={$_('assignee')}
		options={[
			...teamOptions,
			...candidates
				.filter(({ family_name }) => family_name !== '')
				.map((m) => ({ value: m.guid, label: displayName(m) }))
		]}
		bind:value
	/>
{/await}
