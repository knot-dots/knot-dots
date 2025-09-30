<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { createCombobox } from 'svelte-headlessui';
	import ChevronSort from '~icons/knotdots/chevron-sort';
	import Map from '$lib/components/Map.svelte';
	import { fetchAdministrativeAreas } from '$lib/remote/administrativeArea.remote';

	interface Props {
		onchange: (e: Event) => void;
		value?: {
			nameBBSR: string;
			officialRegionalCode: string;
		};
	}

	let { onchange, value }: Props = $props();

	const combobox = createCombobox({
		label: $_('administrative_area'),
		selected: value
	});

	let filterCache = $combobox.filter.substring(0, 2) || value?.nameBBSR.substring(0, 2) || '';

	let name = $derived.by(() => {
		if ($combobox.filter.length > 1) {
			filterCache = $combobox.filter.replace(/\s+/g, '').substring(0, 2);
		}
		return filterCache;
	});

	let administrativeAreasPromise = $derived(fetchAdministrativeAreas(name));
</script>

<div class="dropdown">
	<div class="combobox-input">
		<input
			use:combobox.input
			{onchange}
			oninput={(e) => e.stopPropagation()}
			value={$combobox.selected?.nameBBSR ?? ''}
		/>
		<ChevronSort />
	</div>

	{#if $combobox.expanded}
		<div class="dropdown-panel">
			<ul use:combobox.items>
				{#each administrativeAreasPromise.current?.filter((area) => area.nameBBSR
						.toLowerCase()
						.includes($combobox.filter.toLowerCase().replace(/\s+/g, ''))) ?? [] as value}
					{@const active = $combobox.active?.officialRegionalCode === value.officialRegionalCode}
					{@const selected =
						$combobox.selected?.officialRegionalCode === value.officialRegionalCode}
					<li class:active use:combobox.item={{ value }}>
						<label>
							<input type="radio" value={value.officialRegionalCode} checked={selected} />
							<span class="truncated">{value.nameBBSR}</span>
						</label>
					</li>
				{/each}
			</ul>

			{#if $combobox.active || $combobox.selected}
				{#key $combobox.active}
					<Map feature={$combobox.active?.boundary ?? $combobox.selected?.boundary} />
				{/key}
			{/if}
		</div>
	{/if}
</div>

<style>
	.active > label {
		background-color: var(--color-gray-100);
	}

	.combobox-input {
		position: relative;
	}

	.combobox-input > input {
		border: none;
		border-radius: 4px;
		min-height: var(--dropdown-button-min-height);
		padding: 0.375rem;
	}

	.combobox-input > input + :global(svg) {
		position: absolute;
		right: 0.375rem;
		top: 0.5rem;
	}

	.dropdown-panel {
		flex-direction: row;
		height: 13em;
		justify-content: space-between;
		margin-top: 0.25rem;
		width: 100%;
	}

	.dropdown-panel > ul {
		flex-direction: column;
		flex-grow: 1;
		gap: 0.5rem;
		overflow-y: auto;
	}

	.dropdown-panel :global(.map) {
		border-radius: 8px;
		flex-shrink: 0;
		width: 20rem;
	}
</style>
