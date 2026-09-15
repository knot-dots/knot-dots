<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { type Status, status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	interface Props {
		editable?: boolean;
		labelFn?: (s: Status) => string;
		offset?: [number, number];
		options?: Status[];
		value: Status;
	}

	let {
		editable = false,
		labelFn,
		offset = [0, 4],
		options,
		value = $bindable()
	}: Props = $props();

	const StatusIcon = $derived(statusIcons.get(value));

	function label(s: Status): string {
		return labelFn ? labelFn(s) : $_(s);
	}

	let effectiveOptions = $derived(options ?? status.options);
</script>

{#if editable}
	<Dropdown label={$_('status')} {offset}>
		{#snippet button(popover)}
			<button class="dropdown-button dropdown-button--select" type="button" use:popover.button>
				<span class="badge badge--{statusColors.get(value)}">
					<StatusIcon />{label(value)}
				</span>
			</button>
		{/snippet}

		{#snippet panel(popover)}
			<fieldset class="listbox">
				{#each effectiveOptions.map( (o) => ({ label: label(o), value: o }) ) as option (option.value)}
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
		{/snippet}
	</Dropdown>
{:else}
	<div class="value">
		<span class="badge badge--{statusColors.get(value)}">
			<StatusIcon />
			{label(value)}
		</span>
	</div>
{/if}

<style>
	.dropdown-button.dropdown-button--select,
	.value {
		padding-left: var(--dropdown-button-padding-y);
	}
</style>
