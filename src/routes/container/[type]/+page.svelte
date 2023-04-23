<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { sustainableDevelopmentGoals } from '$lib/models';
</script>

<form method="POST">
	<label>
		{$_('title')}
		<input name="title" type="text" required />
	</label>
	<label>
		{$_('description')}
		<textarea name="description" required />
	</label>
	<label>
		{$_('category')}
		<select name="category" required>
			<option label="" />
			{#each sustainableDevelopmentGoals.options as goal}
				<option label={$_(goal)}>{goal}</option>
			{/each}
		</select>
	</label>
	<p>
		<button class="primary">{$_('save')}</button>
	</p>
</form>

<style>
	form {
		background: white;
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 16px;
	}

	form label:first-child {
		padding-bottom: 18px;
		border-bottom: solid 1px var(--color-gray-300);
	}
</style>
