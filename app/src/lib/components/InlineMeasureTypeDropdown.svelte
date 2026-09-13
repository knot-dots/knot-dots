<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { type MeasureType, measureTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value?: MeasureType;
	}

	let { editable = false, offset = [0, 4], value = $bindable() }: Props = $props();

	const options = [
		{ label: $_('measure'), value: undefined },
		...measureTypes.options.map((o) => ({ label: $_(String(o)), value: o }))
	];
</script>

{#if editable}
	<Dropdown label={$_('measure_type')} {offset}>
		{#snippet button(popover)}
			<button class="dropdown-button" type="button" use:popover.button>
				<span class="badge">
					{value ? $_(String(value)) : $_('measure')}
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
		{value ? $_(String(value)) : $_('measure')}
	</span>
{/if}
