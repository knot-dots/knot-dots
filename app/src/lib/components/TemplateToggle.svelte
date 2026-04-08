<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		value: boolean;
	}

	let { value = $bindable() }: Props = $props();
</script>

<label>
	<input class="toggle" name="template" type="checkbox" bind:checked={value} />
	{$_('template')}
</label>

<style>
	.toggle {
		--height: 1rem;
		--width: 2.25rem;
	}
</style>
