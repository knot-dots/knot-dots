<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: boolean;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<label class="label" for={id}>{$_('template')}</label>

<div class="value">
	<input
		class="toggle"
		disabled={!editable}
		{id}
		name="template"
		type="checkbox"
		bind:checked={value}
	/>
</div>

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}

	.value {
		background-color: transparent;
	}
</style>
