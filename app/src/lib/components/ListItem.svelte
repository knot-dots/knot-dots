<script lang="ts">
	import { useNodeViewContext } from '@prosemirror-adapter/svelte';

	const contentRef = useNodeViewContext('contentRef');
	const selected = useNodeViewContext('selected');
	const node = useNodeViewContext('node');
	const setAttrs = useNodeViewContext('setAttrs');
</script>

<div class:selected={$selected}>
	{#if $node.attrs.checked != null}
		<input
			type="checkbox"
			checked={$node.attrs.checked}
			on:change={() => setAttrs({ checked: !$node.attrs.checked })}
		/>
	{:else if $node.attrs.listType === 'bullet'}
		<span class="bullet"></span>
	{/if}
	<div use:contentRef></div>
</div>

<style>
	div {
		align-items: flex-start;
		display: inline-flex;
		gap: 0.5rem;
		line-height: 1;
	}
	div :global(> *) {
		display: inline-block;
	}
	.bullet {
		background-color: var(--color-gray-500);
		border-radius: 0.625rem;
		flex-shrink: 0;
		height: 0.3125rem;
		margin: 0.375rem 0.375rem 0 0.3125rem;
		width: 0.3125rem;
	}
</style>
