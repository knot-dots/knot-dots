<script lang="ts">
	import { _ } from 'svelte-i18n';
	import UserIcon from '~icons/flowbite/user-solid';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import TeamChip, { teamColor } from '$lib/components/TeamChip.svelte';
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
	const teams = $derived(
		createFeatureDecisions(page.data.features).usePermissionMatrix()
			? page.data.organizationalUnits
					.filter(isTeamContainer)
					.filter((team) => team.organization === organization)
			: []
	);
	const teamOptions = $derived(
		teams.map((team) => ({ value: team.guid, label: team.payload.name }))
	);
	const teamByGuid = $derived(new Map(teams.map((team) => [team.guid, team])));
</script>

{#await candidatesPromise}
	{#if editable}
		<MultipleChoiceDropdown options={[]} value={[]} />
	{:else}
		<span class="badge badge">{$_('empty')}</span>
	{/if}
{:then candidates}
	{const options = $derived([
		...teamOptions,
		...candidates
			.filter(({ family_name }) => family_name !== '')
			.map((m) => ({ value: m.guid, label: displayName(m) }))
	])}
	{const selected = $derived(options.filter((o) => value.includes(o.value)))}
	{#if editable}
		<MultipleChoiceDropdown bind:value {options}>
			{#snippet button(popover)}
				<button
					{@attach tooltip($_('assignee'))}
					class="dropdown-button dropdown-button--select module-implementation-planning"
					type="button"
					use:popover.button
				>
					{#each selected as selectedOption (selectedOption.value)}
						{#if teamByGuid.has(selectedOption.value)}
							<span class="badge badge--large badge--team badge--{teamColor(selectedOption.value)}">
								<span class="truncated">{selectedOption.label}</span>
							</span>
						{:else}
							<span class="badge badge--large">
								<UserIcon />
								<span class="truncated">{selectedOption.label}</span>
							</span>
						{/if}
					{:else}
						<span class="badge badge--large">{$_('empty')}</span>
					{/each}
				</button>
			{/snippet}
		</MultipleChoiceDropdown>
	{:else}
		<ul {@attach tooltip($_('assignee'))} class="value module-implementation-planning">
			{#each selected as selectedOption (selectedOption.value)}
				{@const team = teamByGuid.get(selectedOption.value)}
				{#if team}
					<li>
						<TeamChip team={{ container: team }} />
					</li>
				{:else}
					<li class="badge badge--large">
						<UserIcon />
						<span class="truncated">{selectedOption.label}</span>
					</li>
				{/if}
			{:else}
				<li class="badge badge--large">
					{$_('empty')}
				</li>
			{/each}
		</ul>
	{/if}
{/await}
