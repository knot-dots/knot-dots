<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';

	interface Props {
		offset?: [number, number];
		options: Array<{ href?: string; label: string; value: string | undefined }>;
		value: string | null | undefined;
	}

	let { offset = [0, 4], options, value = $bindable() }: Props = $props();
	let selected = $derived(options.find((o) => o.value == value));

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset } }]
	};
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span class="selected">
			{#if selected}{selected.label}{:else}{$_('empty')}{/if}
		</span>
		<ChevronDown />
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options as option (option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						{option.label}
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}
</div>
