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
		<button
			class={['dropdown-button', buttonStyle === 'default' ? 'dropdown-button--select' : '']}
			type="button"
			use:popover.button
		>
			<span class="badge badge--{statusColors.get(value)}">
				<StatusIcon />{label(value)}
			</span>
		</button>

		{#if $popover.expanded}
			<div class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
				<fieldset class="listbox">
					{#each effectiveOptions.map( (o) => ({ label: label(o), value: o }) ) as option (option.value)}
						{@const StatusIcon = statusIcons.get(option.value)}
						<label>
							<input
								bind:group={value}
								onchange={() => popover.close()}
								type="radio"
								value={option.value}
							/>
							<span class="badge badge--{statusColors.get(option.value)}">
								<StatusIcon />
								{option.label}
							</span>
						</label>
					{/each}
				</fieldset>
			</div>
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
	.dropdown-button {
		--dropdown-button-border-radius: 8px;
	}

	.dropdown-button.dropdown-button--select,
	.value {
		padding-left: var(--dropdown-button-padding-y);
	}
</style>
