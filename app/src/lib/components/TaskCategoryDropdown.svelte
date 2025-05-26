<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { taskCategories } from '$lib/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		value: string;
	}

	let { compact = false, editable = false, value = $bindable() }: Props = $props();

	const popover = createPopover({ label: $_('topic') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	let options = taskCategories.options.map((o) => ({ label: $_(o), value: o }));

	let selected = $derived(options.find((o) => o.value === value));
</script>

{#if editable}
	<SingleChoiceDropdown offset={[compact ? -41 : 0, compact ? -39 : 4]} {options} bind:value />
{:else}
	<div class="value">
		{#if selected}
			{selected.label}
		{:else}
			{$_('empty')}
		{/if}
	</div>
{/if}
