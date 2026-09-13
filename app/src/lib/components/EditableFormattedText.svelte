<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';
	import Viewer from '$lib/components/Viewer.svelte';

	interface Props {
		color?: string;
		editable?: boolean;
		label?: string;
		value?: string;
	}

	let { color, editable = false, label, value = $bindable() }: Props = $props();
</script>

<div class={['details-section', ...(color ? ['stage', `stage--${color}`] : [])]}>
	{#if editable}
		<Editor {label} bind:value />
	{:else}
		{#if label}
			<p class="label">
				<span class="badge badge--purple">{label}</span>
			</p>
		{/if}
		<Viewer {value} />
	{/if}
</div>

<style>
	.label {
		margin: 1rem 0;
	}
</style>
