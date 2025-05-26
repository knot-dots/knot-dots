<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { type TaskStatus, taskStatus } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		value: TaskStatus;
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

	const StatusIcon = $derived(taskStatusIcons.get(value));
</script>

{#if editable}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" type="button" use:popover.button>
			<span class="badge badge--{taskStatusColors.get(value)}">
				<StatusIcon />{$_(value)}
			</span>
			{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				{#each taskStatus.options.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
					{@const StatusIcon = taskStatusIcons.get(option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						<span class="badge badge--{taskStatusColors.get(option.value)}">
							<StatusIcon />
							{option.label}
						</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	{@const StatusIcon = taskStatusIcons.get(value)}
	<div class="value">
		<span class="badge badge--{taskStatusColors.get(value)}">
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
