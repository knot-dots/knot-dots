<script>
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
</script>

<li>
	<label>
		<input
			type="radio"
			name="workspaces"
			checked={$page.url.pathname === '/implementation'}
			on:click={async () => await goto('/implementation')}
		/>
		{$_('workspace.measures')}
	</label>
</li>
<li>
	<label>
		<input
			type="radio"
			name="workspaces"
			checked={$page.url.pathname === '/tasks'}
			on:click={async () => await goto('/tasks')}
		/>
		{$_('workspace.tasks')}
	</label>
</li>
