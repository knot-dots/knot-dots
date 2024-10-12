<script lang="ts">
	import Members from '$lib/components/Members.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { AnyContainer, User } from '$lib/models';

	export let container: AnyContainer;
	export let users: User[];
</script>

<aside>
	<Sidebar helpSlug="overlay-members">
		<slot slot="extra" />
	</Sidebar>
</aside>
<div class="content-details masked-overflow">
	<Members {container} {users} />
</div>
