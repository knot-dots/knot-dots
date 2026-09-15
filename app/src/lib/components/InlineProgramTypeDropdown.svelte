<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { type ProgramType, programTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value: ProgramType;
	}

	let { editable = false, offset = [0, 4], value = $bindable() }: Props = $props();
</script>

{#if editable}
	<Dropdown label={$_('program_type')} {offset}>
		{#snippet button(popover)}
			<button class="dropdown-button" type="button" use:popover.button>
				<span class="badge">
					{value == programTypes.enum['program_type.misc'] ? $_('program') : $_(String(value))}
				</span>
			</button>
		{/snippet}

		{#snippet panel(popover)}
			<fieldset class="listbox">
				{#each programTypes.options as option (option)}
					<label>
						<input
							bind:group={value}
							onchange={() => popover.close()}
							type="radio"
							value={option}
						/>
						<span class="badge">
							{option == programTypes.enum['program_type.misc']
								? $_('program')
								: $_(String(option))}
						</span>
					</label>
				{/each}
			</fieldset>
		{/snippet}
	</Dropdown>
{:else}
	<span class="badge">
		{value == programTypes.enum['program_type.misc'] ? $_('program') : $_(String(value))}
	</span>
{/if}
