<script lang="ts">
	import Members from '$lib/components/Members.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import type { AnyContainer, User } from '$lib/models';

	interface Props {
		container: AnyContainer;
		users: User[];
	}

	let { container, users }: Props = $props();
</script>

<Navigation sortOptions={[]} workspaceOptions={[]} />
<div class="content-details masked-overflow">
	<Members {container} {users} />
</div>
