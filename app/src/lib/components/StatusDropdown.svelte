<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-16-solid';
	import { type Status, status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	interface Props {
		buttonStyle?: 'badge' | 'default';
		editable?: boolean;
		labelFn?: (s: Status) => string;
		offset?: [number, number];
		options?: Status[];
		value: Status;
	}

	let {
		buttonStyle = 'default',
		editable = false,
		labelFn,
		offset = [0, 4],
		options,
		value = $bindable()
	}: Props = $props();

	const popover = createPopover({ label: $_('status') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset } }] };

	const StatusIcon = $derived(statusIcons.get(value));

	function label(s: Status): string {
		return labelFn ? labelFn(s) : $_(s);
	}

	let effectiveOptions = $derived(options ?? status.options);
</script>

{#if editable}
	<div class="dropdown" use:popperRef>
		<button class="dropdown-button" type="button" use:popover.button>
			{#if buttonStyle === 'badge'}
				<span class="badge badge--{statusColors.get(value)}">
					<StatusIcon />{label(value)}
					{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
				</span>
			{:else}
				<span class="badge badge--{statusColors.get(value)}">
					<StatusIcon />{label(value)}
				</span>
				{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
			{/if}
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				{#each effectiveOptions.map( (o) => ({ label: label(o), value: o }) ) as option (option.value)}
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
			{label(value)}
		</span>
	</div>
{/if}

<style>
	.badge {
		float: left;
	}
</style>
