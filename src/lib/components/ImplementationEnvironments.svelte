<script>
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
</script>

<li>
	<label>
		<input
			type="radio"
			name="environments"
			checked={$page.url.pathname === '/implementation'}
			on:click={async () => await goto('/implementation')}
		/>
		{$_('measures')}
	</label>
</li>
<li>
	<label>
		<input
			type="radio"
			name="environments"
			checked={$page.url.pathname === '/tasks'}
			on:click={async () => await goto('/tasks')}
		/>
		{$_('tasks')}
	</label>
</li>
