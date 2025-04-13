<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { applicationState } from '$lib/stores';
</script>

<label>
	<input
		class="toggle"
		type="checkbox"
		bind:checked={$applicationState.containerDetailView.editable}
		value={$applicationState.containerDetailView.editable ? $_('on') : $_('off')}
	/>
</label>

<style>
	.toggle {
		--height: 1.75rem;
		--padding: 0.25rem;
		--width: 4.5rem;

		background-color: var(--color-gray-050);
		border: solid 1px var(--color-gray-200);
		position: relative;
	}

	.toggle::after {
		color: var(--color-gray-500);
		content: attr(value);
		position: absolute;
		right: var(--padding);
		text-align: center;
		text-transform: capitalize;
		top: calc(var(--height) / 2 - 0.5em);
		width: calc(var(--width) - var(--height));
	}

	.toggle::before {
		background-color: var(--color-gray-200);
		background-image: url(/src/lib/assets/icons/edit-mode-off.svg);
		background-position: 0.5rem center;
		background-repeat: no-repeat;
	}

	.toggle:checked {
		background-color: var(--color-green-050);
		border: solid 1px var(--color-green-200);
	}

	.toggle:checked::after {
		color: var(--color-green-500);
		left: var(--padding);
	}

	.toggle:checked::before {
		background-color: var(--color-green-500);
		background-image: url(/src/lib/assets/icons/edit-mode-on.svg);
	}
</style>
