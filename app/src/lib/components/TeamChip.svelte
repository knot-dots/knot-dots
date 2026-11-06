<script lang="ts">
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import { overlayKey, overlayURL, type TeamWithMembers } from '$lib/models';

	interface Props {
		team: Omit<TeamWithMembers, 'members'> & Partial<Pick<TeamWithMembers, 'members'>>;
	}

	let { team }: Props = $props();

	const name = $derived(team.container.payload.name);
	const members = $derived(team.members);
</script>

<a
	aria-label={$_('teams.show_members', { values: { name } })}
	class="badge badge--large badge--purple"
	href={overlayURL(page.url, overlayKey.enum.team, team.container.guid)}
>
	<span class="truncated">{members ? `${name} · ${members.length}` : name}</span>
</a>
