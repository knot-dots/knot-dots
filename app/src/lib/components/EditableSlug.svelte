<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value?: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();

	function oninput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;

		if (!input.validity.valid) {
			event.stopPropagation();
		}

		value = input.value;
	}
</script>

{#if editable}
	<label class="label" for={id}>{$_('slug')}</label>
	<input
		class="value"
		{id}
		{oninput}
		pattern="[a-z0-9-]+"
		placeholder={$_('slug.placeholder')}
		type="text"
		{value}
	/>
{:else}
	<span class="label">{$_('slug')}</span>
	<span class="value">{value}</span>
{/if}

<style>
	input {
		border: none;
	}
</style>
