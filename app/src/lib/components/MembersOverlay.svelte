<script lang="ts">
	import { getContext } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Members from '$lib/components/Members.svelte';
	import type { AnyContainer, User } from '$lib/models';

	interface Props {
		container: AnyContainer;
		users: User[];
	}

	let { container, users }: Props = $props();

	let workspaceOptions = getContext<Array<{ label: string; value: string }>>('workspaceOptions');
</script>

<Header {workspaceOptions} />
<div class="content-details masked-overflow">
	<Members {container} {users} />
</div>
