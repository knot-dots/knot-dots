<script context="module">
	let counter = 0;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';

	export let compact = false;
	export let editable = false;
	export let value = 0;

	let id = `date-${counter++}`;
</script>

<div class="progress">
	{#if editable}
		<h3>
			<label for={id}>
				{$_('progress')}
			</label>
		</h3>
		<p>
			<input {id} type="range" max="1" min="0" list="steps" step="0.1" bind:value />
			<datalist id="steps">
				<option value="0"></option>
				<option value="0.1"></option>
				<option value="0.2"></option>
				<option value="0.3"></option>
				<option value="0.4"></option>
				<option value="0.5"></option>
				<option value="0.6"></option>
				<option value="0.7"></option>
				<option value="0.8"></option>
				<option value="0.9"></option>
				<option value="1"></option>
			</datalist>
		</p>
	{:else}
		<h3>{$_('progress')}</h3>
		<p>
			<progress
				style:--color={value > 0.7
					? 'var(--color-green-500)'
					: value > 0.3
						? 'var(--color-yellow-200)'
						: 'var(--color-red-600)'}
				class:compact
			/>
			{#if !compact}
				{value * 100} %
			{/if}
		</p>
	{/if}
</div>

<style>
	p {
		padding: 0 1rem;
	}

	input[type='range'] {
		display: inline-block;
		padding: 0;
		vertical-align: middle;
	}

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

	.compact {
		width: 100%;
	}
</style>
