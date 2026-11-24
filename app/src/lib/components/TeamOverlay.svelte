<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import TeamRoster from '$lib/components/TeamRoster.svelte';
	import type { Container, OrganizationalUnitPayload, User } from '$lib/models';

	interface Props {
		container: Container<OrganizationalUnitPayload>;
		mayManage: boolean;
		parent: { guid: string; name: string };
		users: User[];
	}

	let { container, mayManage, parent, users }: Props = $props();
</script>

<Header workspaceOptions={[]} />

<div class="content">
	<div class="details details-scroll-wrapper">
		<TeamRoster {container} {mayManage} {parent} {users} />
	</div>

	<ContextTabs slug="members" />
</div>
