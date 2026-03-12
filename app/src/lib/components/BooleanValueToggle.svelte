<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
	}

	let { checked = $bindable(), disabled = false, label }: Props = $props();
</script>

{#if label}
	<label>
		<span class="badge badge--purple">{label}</span>
		<input
			bind:checked
			class="toggle"
			{disabled}
			type="checkbox"
			value={checked ? $_('yes') : $_('no')}
		/>
	</label>
{:else}
	<input
		bind:checked
		class="toggle"
		{disabled}
		type="checkbox"
		value={checked ? $_('yes') : $_('no')}
	/>
{/if}

<style>
	.toggle {
		--height: 2.375rem;
		--padding: 0.25rem;
		--width: 8rem;

		background-color: var(--color-gray-050);
		border: solid 1px var(--color-gray-200);
		display: grid;
		margin: 2rem auto;
	}

	.toggle::before {
		background-color: var(--color-gray-200);
		color: var(--color-gray-900);
		content: attr(value);
		place-content: center;
		text-align: center;
		width: 5rem;
	}

	.toggle:checked::before {
		background-color: var(--color-gray-600);
		color: var(--color-white);
		transform: translateX(calc(var(--width) - 5rem));
	}

	label:has(> input[type='checkbox']) {
		align-items: flex-start;
		background-color: var(--color-gray-025);
		border: solid 1px var(--color-gray-200);
		border-radius: 8px;
		display: inline-flex;
		flex-direction: column;
		min-width: 14rem;
		padding: 1.25rem 1rem 2rem;
	}
</style>
