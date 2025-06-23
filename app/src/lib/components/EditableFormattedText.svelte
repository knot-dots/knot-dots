<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';

	interface Props {
		editable?: boolean;
		label?: string;
		value?: string;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();
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
