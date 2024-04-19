<script>
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
</script>

<li>
	<label>
		<input
			type="radio"
			checked={$page.url.pathname === '/indicators'}
			on:click={async () => await goto('/indicators')}
		/>
		{$_('workspace.indicators')}
	</label>
</li>
<li>
	<label>
		<input
			type="radio"
			checked={$page.url.pathname === '/indicator-monitoring'}
			on:click={async () => await goto('/indicator-monitoring')}
		/>
		{$_('workspace.indicator_monitoring')}
	</label>
</li>
