<script lang="ts">
	import { createFloatingActions } from 'svelte-floating-ui';
	import { flip, offset, shift } from 'svelte-floating-ui/dom';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { type GoalStatus, goalStatus } from '$lib/models';
	import { goalStatusColors, goalStatusIcons } from '$lib/theme/models';

	interface Props {
		buttonStyle?: 'badge' | 'default';
		editable?: boolean;
		offset?: [number, number];
		value: GoalStatus;
	}

	let {
		buttonStyle = 'default',
		editable = false,
		offset: offsetArgs = [0, 4],
		value = $bindable()
	}: Props = $props();

	const popover = createPopover({ label: $_('status') });

	const [floatingRef, floatingContent] = createFloatingActions({
		middleware: [offset({ mainAxis: offsetArgs[1], crossAxis: offsetArgs[0] }), flip(), shift()],
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const StatusIcon = $derived(goalStatusIcons.get(value));
</script>

{#if editable}
	<div class="dropdown" use:floatingRef>
		<button class="dropdown-button" type="button" use:popover.button>
			{#if buttonStyle === 'badge'}
				<span class="badge badge--{goalStatusColors.get(value)}">
					<StatusIcon />{$_(value)}
					{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
				</span>
			{:else}
				<span class="badge badge--{goalStatusColors.get(value)}">
					<StatusIcon />{$_(value)}
				</span>
				{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
			{/if}
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:floatingContent use:popover.panel>
				{#each goalStatus.options.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
					{@const StatusIcon = goalStatusIcons.get(option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						<span class="badge badge--{goalStatusColors.get(option.value)}">
							<StatusIcon />
							{option.label}
						</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	{@const StatusIcon = goalStatusIcons.get(value)}
	<div class="value">
		<span class="badge badge--{goalStatusColors.get(value)}">
			<StatusIcon />
			{$_(value)}
		</span>
	</div>
{/if}
