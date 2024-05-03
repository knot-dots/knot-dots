<script>
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
</script>

<li class="group">
	<p>{$_('board.programs')}</p>
	<ul>
		<li>
			<label>
				<input
					type="radio"
					checked={$page.url.pathname === '/programs'}
					on:click={async () => await goto('/programs')}
				/>
				{$_('workspace.programs')}
			</label>
		</li>
		<li>
			<label>
				<input
					type="radio"
					checked={$page.url.pathname === '/programs-by-level'}
					on:click={async () => await goto('/programs-by-level')}
				/>
				{$_('workspace.programs_by_level')}
			</label>
		</li>
	</ul>
</li>

<li class="group">
	<p>{$_('board.implementation')}</p>
	<ul>
		<li>
			<label>
				<input
					type="radio"
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
					checked={$page.url.pathname === '/tasks'}
					on:click={async () => await goto('/tasks')}
				/>
				{$_('workspace.tasks')}
			</label>
		</li>
		<li>
			<label>
				<input
					type="radio"
					checked={$page.url.pathname === '/measure-monitoring'}
					on:click={async () => await goto('/measure-monitoring')}
				/>
				{$_('workspace.measure_monitoring')}
			</label>
		</li>
	</ul>
</li>

<li class="group">
	<p>{$_('board.indicators')}</p>
	<ul>
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
	</ul>
</li>

<style>
	p {
		margin-bottom: 0.5rem;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group {
		border: solid 1px var(--color-gray-100);
		border-radius: 8px;
		overflow-y: auto;
		padding: 0.25rem;
	}
</style>
