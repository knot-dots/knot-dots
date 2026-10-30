<script module lang="ts">
	// a stable color per team, so it looks the same wherever it turns up; the
	// two colors of the design keep the role colors free
	const colors = ['purple', 'pink'];

	export function teamColor(guid: string) {
		return colors[[...guid].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
	}
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import fetchMembers from '$lib/client/fetchMembers';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { displayName, type TeamWithMembers, type User } from '$lib/models';

	interface Props {
		manageHref?: string;
		// without members the roster is fetched once the popover opens
		team: Omit<TeamWithMembers, 'members'> & Partial<Pick<TeamWithMembers, 'members'>>;
	}

	let { manageHref, team }: Props = $props();

	const color = $derived(teamColor(team.container.guid));
	const name = $derived(team.container.payload.name);

	let fetchedMembers: User[] | undefined = $state();
	const members = $derived(team.members ?? fetchedMembers);

	async function loadMembers() {
		if (team.members || fetchedMembers) {
			return;
		}
		try {
			fetchedMembers = await fetchMembers(team.container.guid);
		} catch (error) {
			console.log(error);
			fetchedMembers = [];
		}
	}

	// members who have not signed up yet carry no name
	function memberName(member: User) {
		const label = displayName(member);
		return label === member.guid ? $_('user.invitation_sent') : label;
	}
</script>

<Dropdown label={$_('teams.show_members', { values: { name } })} strategy="fixed">
	{#snippet button(popover)}
		<button
			class="badge badge--large badge--team badge--{color} team-chip"
			type="button"
			use:popover.button
			onclick={loadMembers}
		>
			<span class="team-name">{members ? `${name} · ${members.length}` : name}</span>
		</button>
	{/snippet}

	{#snippet panel()}
		<div class="team-members">
			<strong>{$_('teams.members')}</strong>
			{#if members === undefined}
				<p>{$_('loading')}</p>
			{:else if members.length > 0}
				<ul>
					{#each members as member (member.guid)}
						<li>{memberName(member)}</li>
					{/each}
				</ul>
			{:else}
				<p>{$_('teams.no_members')}</p>
			{/if}
			{#if manageHref}
				<a href={manageHref}>{$_('teams.manage')} →</a>
			{/if}
		</div>
	{/snippet}
</Dropdown>

<style>
	/* the button keeps the badge colors against the global button states */
	.team-chip,
	.team-chip:hover,
	.team-chip:active {
		background: var(--badge-background-color);
		border-color: var(--badge-border-color, var(--color-border-raised));
		cursor: pointer;
	}

	.team-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.team-members {
		font-size: 0.875rem;
		min-width: 12rem;
		padding: 0.5rem 0.75rem;
	}

	.team-members ul {
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0;
	}

	.team-members li {
		padding: 0.125rem 0;
	}

	.team-members p {
		color: var(--color-text-muted);
		margin: 0.25rem 0 0;
	}

	.team-members a {
		display: block;
		margin-top: 0.5rem;
	}
</style>
