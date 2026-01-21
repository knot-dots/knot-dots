<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { type ProgramStatus, programStatus } from '$lib/models';
	import { programStatusColors, programStatusIcons } from '$lib/theme/models';

	interface Props {
		buttonStyle?: 'badge' | 'default';
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		value: ProgramStatus;
	}

	let {
		buttonStyle = 'default',
		editable = false,
		labelledBy,
		offset = [0, 4],
		value = $bindable()
	}: Props = $props();

	const popover = createPopover({ label: $_('status') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset } }] };

	const StatusIcon = $derived(programStatusIcons.get(value));
</script>

{#if editable}
	<div class="dropdown" use:popperRef>
		<button
			aria-labelledby={labelledBy}
			class="dropdown-button dropdown-button--badge"
			type="button"
			use:popover.button
		>
			{#if buttonStyle === 'badge'}
				<span class="badge badge--{programStatusColors.get(value)}">
					<StatusIcon />{$_(value)}
					{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
				</span>
			{:else}
				<span class="badge badge--{programStatusColors.get(value)}">
					<StatusIcon />{$_(value)}
				</span>
				{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
			{/if}
		</button>

		{#if $popover.expanded}
			<fieldset
				aria-labelledby={labelledBy}
				class="dropdown-panel"
				use:popperContent={extraOpts}
				use:popover.panel
			>
				{#each programStatus.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
					{@const StatusIcon = programStatusIcons.get(option.value)}
					<label>
						<input type="radio" value={option.value} bind:group={value} />
						<span class="badge badge--{programStatusColors.get(option.value)}">
							<StatusIcon />
							{option.label}
						</span>
					</label>
				{/each}
			</fieldset>
		{/if}
	</div>
{:else}
	{@const StatusIcon = programStatusIcons.get(value)}
	<div class="value">
		<span class="badge badge--{programStatusColors.get(value)}">
			<StatusIcon />
			{$_(value)}
		</span>
	</div>
{/if}
