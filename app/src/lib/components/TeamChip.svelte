<script lang="ts">
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import { overlayKey, overlayURL, type TeamWithMembers } from '$lib/models';

	interface Props {
		// the member count shows when the roster came along
		team: Omit<TeamWithMembers, 'members'> & Partial<Pick<TeamWithMembers, 'members'>>;
	}

	let { team }: Props = $props();

	const name = $derived(team.container.payload.name);
	const members = $derived(team.members);
</script>

<!-- the chip opens the team in the overlay, where its roster can be seen and
     edited by those allowed to -->
<a
	aria-label={$_('teams.show_members', { values: { name } })}
	class="badge badge--large badge--team badge--purple team-chip"
	href={overlayURL(page.url, overlayKey.enum.team, team.container.guid)}
>
	<span class="team-name">{members ? `${name} · ${members.length}` : name}</span>
</a>

<style>
	.team-chip {
		text-decoration: none;
	}

	.team-chip:hover {
		text-decoration: none;
	}

	.team-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
