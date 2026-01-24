<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { AnyPayload, Container, User } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		users: User[];
	}

	let { container, users }: Props = $props();
</script>

<Header workspaceOptions={[]} />
<div class="content-details">
	<div class="details">
		<div class="details-section">
			<Members {container} {users} />
		</div>
	</div>
</div>
<Help slug="members" />
