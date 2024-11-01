<script lang="ts">
	import CrepeEditor from '$lib/components/CrepeEditor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';

	export let editable = false;
	export let label: string = '';
	export let value: string | undefined = undefined;
</script>

{#if editable}
	<CrepeEditor bind:value>
		{#if label}
			<h3>{label}</h3>
		{/if}
	</CrepeEditor>
{:else}
	<div>
		{#if label}
			<h3>{label}</h3>
		{/if}
		<Viewer {value} />
	</div>
{/if}
