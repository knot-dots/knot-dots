<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { AnyContainer, User } from '$lib/models';

	interface Props {
		container: AnyContainer;
		users: User[];
	}

	let { container, users }: Props = $props();
</script>

<Header sortOptions={[]} workspaceOptions={[]} />
<div class="content-details masked-overflow">
	<Members {container} {users} />
</div>
