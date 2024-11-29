<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { applicationState } from '$lib/stores';

	const viewModes = ['view_mode.preview', 'view_mode.table'];
</script>

{#each viewModes.map((o) => [$_(o), o]) as [label, value]}
	<li>
		<label>
			<input type="radio" {value} bind:group={$applicationState.containerDetailView.mode} />
			{label}
		</label>
	</li>
{/each}
