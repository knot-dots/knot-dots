<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';

	export let editable = false;
	export let label: string = '';
	export let value: string | undefined = undefined;
</script>

{#if editable}
	<Editor {label} bind:value />
{:else}
	<div class="details-tab">
		{#if label}
			<p class="label">
				<span class="badge badge--purple">{label}</span>
			</p>
		{/if}
		<Viewer {value} />
	</div>
{/if}

<style>
	.label {
		margin-bottom: 1rem;
	}
</style>
