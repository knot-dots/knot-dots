<script lang="ts">
	export let compact = false;
	export let value = 0;
</script>

<progress
	{value}
	style:--color={value > 0.7
		? 'var(--color-green-500)'
		: value > 0.3
			? 'var(--color-yellow-200)'
			: 'var(--color-red-600)'}
	class:compact
></progress>

{#if !compact}
	{value * 100} %
{/if}

<style>
	.compact {
		width: 100%;
	}
</style>
