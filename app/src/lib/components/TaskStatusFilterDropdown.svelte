<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '~icons/knotdots/filter-badge';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { type Status, status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	interface Props {
		options?: Status[];
		value: Status[];
	}

	let { options, value = $bindable() }: Props = $props();

	let effectiveOptions = $derived(
		options ?? status.options.filter((s) => s !== 'status.in_operation')
	);
</script>

<Dropdown offset={[0, 4]}>
	{#snippet button(popover)}
		<button class="dropdown-button dropdown-button--select" type="button" use:popover.button>
			<Filter />
			<strong class="label">{$_('status')}:</strong>
			{#if value.length > 0}
				<span class="selected">
					{#each effectiveOptions
						.filter((o) => value.includes(o))
						.map((o) => ({ label: $_(o), value: o })) as selectedOption (selectedOption.value)}
						<span class="value">{selectedOption.label}</span>
					{:else}
						&nbsp;
					{/each}
				</span>
			{/if}
		</button>
	{/snippet}

	{#snippet panel()}
		<fieldset class="listbox">
			{#each effectiveOptions.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
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
	{/snippet}
</Dropdown>

<style>
	.selected {
		display: block;
	}

	.value {
		display: inline;
		list-style: none;
		padding: 0;
		text-align: left;
		text-wrap: nowrap;
	}

	.value:not(:last-child)::after {
		content: ', ';
	}
</style>
