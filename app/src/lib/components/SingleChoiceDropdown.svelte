<script lang="ts">
	import { createFloatingActions } from 'svelte-floating-ui';
	import { offset, flip, shift } from 'svelte-floating-ui/dom';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';

	interface Props {
		offset?: [number, number];
		options: Array<{ href?: string; label: string; value: string | null | undefined }>;
		value: string | null | undefined;
	}

	let { offset: offsetArgs = [0, 4], options, value = $bindable() }: Props = $props();
	let selected = $derived(options.find((o) => o.value == value));

	const popover = createPopover({});

	const [floatingRef, floatingContent] = createFloatingActions({
		middleware: [offset({ mainAxis: offsetArgs[1], crossAxis: offsetArgs[0] }), flip(), shift()],
		placement: 'bottom-start',
		strategy: 'absolute'
	});
</script>

<div class="dropdown" use:floatingRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span class="truncated">
			{#if selected}{selected.label}{:else}{$_('empty')}{/if}
		</span>
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:floatingContent use:popover.panel>
			<div>
				{#each options as option (option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						<span class="truncated">{option.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>
