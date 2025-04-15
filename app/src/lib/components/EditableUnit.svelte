<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	let timer: ReturnType<typeof setTimeout>;

	function debouncedSubmit(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			input.closest('form')?.requestSubmit();
		}, 2000);
	}
</script>

{#if editable}
	<label class="label" for="unit">
		{$_('unit')}
	</label>
	<input class="value" id="unit" name="unit" oninput={debouncedSubmit} type="text" bind:value />
{:else}
	<span class="label">{$_('unit')}</span>
	<span class="value">{value || $_('empty')}</span>
{/if}

<style>
	input {
		border: none;
	}
</style>
