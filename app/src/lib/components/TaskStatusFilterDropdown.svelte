<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/heroicons/chevron-down-16-solid';
	import Filter from '~icons/knotdots/filter-badge';
	import { type TaskStatus, taskStatus } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';

	interface Props {
		value: TaskStatus[];
	}

	let { value = $bindable() } = $props();

	const popover = createPopover({ label: $_('filter') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button dropdown-button--badge" type="button" use:popover.button>
		<Filter />
		<strong class="label">{$_('task_status.label')}:</strong>
		{#if value.length > 0}
			<span class="selected">
				{#each taskStatus.options
					.filter((o) => value.includes(o))
					.map((o) => ({ label: $_(o), value: o })) as selectedOption}
					<span class="value">{selectedOption.label}</span>
				{:else}
					&nbsp;
				{/each}
			</span>
		{/if}
		<ChevronDown />
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			{#each taskStatus.options.map((o) => ({ label: $_(o), value: o })) as option (option.value)}
				{@const TaskStatusIcon = taskStatusIcons.get(option.value)}
				<label>
					<input type="checkbox" value={option.value} bind:group={value} />
					<span class="badge badge--{taskStatusColors.get(option.value)}">
						<TaskStatusIcon />
						{option.label}
					</span>
				</label>
			{/each}
		</fieldset>
	{/if}
</div>

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

	.dropdown-button :global(svg:first-child) {
		height: 1rem;
		width: 1rem;
	}
</style>
