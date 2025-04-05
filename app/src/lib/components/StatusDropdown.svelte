<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import { type Status, status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	interface Props {
		editable?: boolean;
		value: Status;
	}

	let { editable = false, value = $bindable() } = $props();

	const popover = createPopover({ label: $_('status') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [-41, -41] } }]
	};

	const StatusIcon = $derived(statusIcons.get(value));
</script>

{#if editable}
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
						<input type="radio" value={option.value} bind:group={value} />
						<span class="badge badge--{statusColors.get(option.value)}">
							<StatusIcon />
							{option.label}
						</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	{@const StatusIcon = statusIcons.get(value)}
	<div class="value">
		<span class="badge badge--{statusColors.get(value)}">
			<StatusIcon />
			{$_(value)}
		</span>
	</div>
{/if}

<style>
	.badge {
		float: left;
	}
</style>
