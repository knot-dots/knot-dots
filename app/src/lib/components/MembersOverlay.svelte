<script lang="ts">
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { AnyPayload, Container, User } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		users: User[];
	}

	let { container, users }: Props = $props();
</script>

<Header workspaceOptions={[]} />

<div class="content">
	<div class="details">
		<div class="details-section">
			<Members {container} {users} />
		</div>
	</div>

	<ContextTabs slug="members" />
</div>
