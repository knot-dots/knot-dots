<script lang="ts">
	export let value = 0;
</script>

<progress
	{value}
	style:--color={value > 0.7
		? 'var(--color-green-500)'
		: value > 0.3
		? 'var(--color-yellow-200)'
		: 'var(--color-red-600)'}
/>

{value * 100} %

<style>
	progress {
		--height: 6px;

		appearance: none;
		background-color: var(--color-gray-200);
		border: none;
		border-radius: calc(var(--height) * 0.5);
		height: var(--height);
		margin-right: 1rem;
		overflow: hidden;
		vertical-align: middle;
	}

	progress::-webkit-progress-bar {
		background-color: inherit;
	}

	progress::-webkit-progress-value {
		background-color: var(--color, var(--color-gray-200));
	}

	progress::-moz-progress-bar {
		background-color: var(--color, var(--color-gray-200));
	}
</style>
