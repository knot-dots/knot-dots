<script module>
	let counter = 0;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value?: number;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	let id = `date-${counter++}`;
</script>

<div class="progress">
	{#if editable}
		<p class="label">
			<label for={id}>
				{$_('progress')}
			</label>
		</p>
		<p class="value">
			<input
				bind:value
				defaultValue="0"
				{id}
				list="steps"
				max="1"
				min="0"
				step="0.1"
				type="range"
			/>
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
		<p class="label">{$_('progress')}</p>
		<p class="value">
			<progress
				style:--color={value && value > 0.7
					? 'var(--color-green-500)'
					: value && value > 0.3
						? 'var(--color-yellow-300)'
						: 'var(--color-red-600)'}
				{value}
			></progress>
		</p>
	{/if}
</div>

<style>
	div {
		padding-bottom: 0.5rem;
	}

	input[type='range'] {
		margin: 0;
		padding: 0.125rem 0;
		width: 100%;
	}

	progress {
		width: 100%;
	}
</style>
