<script lang="ts">
	import { createFloatingActions } from 'svelte-floating-ui';
	import { offset, flip, shift } from 'svelte-floating-ui/dom';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowsUpDown from '~icons/heroicons/arrows-up-down-16-solid';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	interface Props {
		options: Array<{ href?: string; label: string; value: string | undefined }>;
		value: string | null | undefined;
	}

	let { options, value = $bindable() }: Props = $props();
	let selected = $derived(options.find((o) => o.value == value));

	const popover = createPopover({ label: $_('sort') });

	const [floatingRef, floatingContent] = createFloatingActions({
		middleware: [offset({ mainAxis: 4 }), flip(), shift()],
		placement: 'bottom-start',
		strategy: 'absolute'
	});
</script>

<div class="dropdown" use:floatingRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<ArrowsUpDown />{#if selected}{selected.label}{:else}&nbsp;{/if}
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:floatingContent use:popover.panel>
			{#each options as option (option.value)}
				<label>
					<input type="radio" value={option.value} bind:group={value} />
					{option.label}
				</label>
			{/each}
		</fieldset>
	{/if}
</div>
