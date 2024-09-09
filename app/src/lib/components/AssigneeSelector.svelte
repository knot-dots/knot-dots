<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { displayName, type User } from '$lib/models';

	export let candidates: User[];
	export let value: string | undefined;
</script>

<div class="meta">
	<p class="meta-key">{$_('assignee')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('assignee')}
			options={candidates
				.filter(({ family_name }) => family_name !== '')
				.map((m) => ({ value: m.guid, label: displayName(m) }))}
			bind:value
		/>
	</div>
</div>
