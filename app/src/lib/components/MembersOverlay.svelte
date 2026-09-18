<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { AnyPayload, Container, Grant, User } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		grants: Grant[];
		inheritedGrants?: Grant[];
		inheritedUsers?: User[];
		scope?: Container<AnyPayload>;
		users: User[];
	}

	let { container, grants, inheritedGrants, inheritedUsers, scope, users }: Props = $props();
</script>

<Header workspaceOptions={[]} />

<div class="content">
	<div class="details details-scroll-wrapper">
		<div class="details-section">
			<Members {container} {grants} {inheritedGrants} {inheritedUsers} {scope} {users} />
		</div>
	</div>

	<ContextTabs slug="members" />
</div>
