<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';

	export let editable = false;
	export let label: string = '';
	export let value: string | undefined = undefined;
</script>

{#if editable}
	<Editor {label} bind:value autosave />
{:else}
	<div>
		{#if label}
			<h3>{label}</h3>
		{/if}
		<Viewer {value} />
	</div>
{/if}
