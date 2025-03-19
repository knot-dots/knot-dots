<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import { type Status, status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	interface Props {
		value: Status;
	}

	let { value = $bindable() } = $props();

	const popover = createPopover();

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [-40, -45] } }]
	};

	const StatusIcon = $derived(statusIcons.get(value));
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<span class="badge badge--{statusColors.get(value)}">
			<StatusIcon />{$_(value)}
		</span>
		<ChevronDown />
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#each status.options.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
				{@const StatusIcon = statusIcons.get(option.value)}
				<label>
					<input type="checkbox" value={option.value} bind:group={value} />
					<span class="badge badge--{statusColors.get(option.value)}">
						<StatusIcon />
						{option.label}
					</span>
				</label>
			{/each}
		</fieldset>
	{/if}
</div>

<style>
	@container style(--drop-down-style: table) {
		button > :global(svg) {
			display: none;
		}
	}
</style>
