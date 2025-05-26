<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { type ResolutionStatus } from '$lib/models';
	import { resolutionStatusColors, resolutionStatusIcons } from '$lib/theme/models';
	import { resolutionStatus } from '$lib/models.js';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		value: ResolutionStatus;
	}

	let { compact = false, editable = false, value = $bindable() } = $props();

	const popover = createPopover({ label: $_('status') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [-41, -41] } }]
	};

	const StatusIcon = $derived(resolutionStatusIcons.get(value));
</script>

{#if editable}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" type="button" use:popover.button>
			<span class="badge badge--{resolutionStatusColors.get(value)}">
				<StatusIcon />{$_(value)}
			</span>
			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				{#each resolutionStatus.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
					{@const StatusIcon = resolutionStatusIcons.get(option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						<span class="badge badge--{resolutionStatusColors.get(option.value)}">
							<StatusIcon />
							{option.label}
						</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	{@const StatusIcon = resolutionStatusIcons.get(value)}
	<div class="value">
		<span class="badge badge--{resolutionStatusColors.get(value)}">
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
