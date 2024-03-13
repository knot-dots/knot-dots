<script>
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
</script>

<li>
	<a
		class="button button-nav"
		class:is-active={$page.url.pathname === '/implementation'}
		href="/implementation"
	>
		{$_('measures')}
	</a>
</li>
<li>
	<a class="button button-nav" class:is-active={$page.url.pathname === '/tasks'} href="/tasks">
		{$_('tasks')}
	</a>
</li>
