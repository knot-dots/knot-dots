<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ArrowsUpDown from '~icons/heroicons/arrows-up-down-16-solid';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';

	interface Props {
		options: Array<{ href?: string; label: string; value: string | undefined }>;
		value: string | null | undefined;
	}

	let { options, value = $bindable() }: Props = $props();
	let selected = $derived(options.find((o) => o.value == value));

	const popover = createPopover({ label: $_('sort') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button dropdown-button--badge" type="button" use:popover.button>
		<ArrowsUpDown />{#if selected}{selected.label}{:else}&nbsp;{/if}<ChevronDown />
	</button>
	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#each options as option (option.value)}
				<label>
					<input type="radio" value={option.value} bind:group={value} />
					{option.label}
				</label>
			{/each}
		</fieldset>
	{/if}
</div>
