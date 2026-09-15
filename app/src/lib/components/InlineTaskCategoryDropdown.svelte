<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { taskCategories, type TaskCategory } from '$lib/models';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value?: TaskCategory;
	}

	let { editable = false, offset = [0, 4], value = $bindable() }: Props = $props();

	const options = [
		{ label: $_('task'), value: undefined },
		...taskCategories.options.map((o) => ({ label: $_(String(o)), value: o }))
	];
</script>

{#if editable}
	<Dropdown label={$_('task_category')} {offset}>
		{#snippet button(popover)}
			<button class="dropdown-button" type="button" use:popover.button>
				<span class="badge">
					{value ? $_(String(value)) : $_('task')}
				</span>
			</button>
		{/snippet}

		{#snippet panel(popover)}
			<fieldset class="listbox">
				{#each options as option (option.value)}
					<label>
						<input
							bind:group={value}
							onchange={() => popover.close()}
							type="radio"
							value={option.value}
						/>
						<span class="badge">
							{option.label}
						</span>
					</label>
				{/each}
			</fieldset>
		{/snippet}
	</Dropdown>
{:else}
	<span class="badge">
		{value ? $_(String(value)) : $_('task')}
	</span>
{/if}
