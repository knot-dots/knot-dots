<script lang="ts">
	import { resource } from 'runed';
	import { createCombobox } from 'svelte-headlessui';
	import { z } from 'zod';
	import ChevronSort from '~icons/flowbite/chevron-sort-outline';
	import Map from '$lib/components/Map.svelte';

	const administrativeAreaSummary = z.object({
		boundary: z.object({
			id: z.string().uuid(),
			type: z.literal('Feature')
		}),
		cityAndMunicipalityTypeBBSR: z.string().nullable(),
		nameOSM: z.string(),
		officialMunicipalityKey: z.string().nullable(),
		officialRegionalCode: z.string()
	});

	const administrativeArea = administrativeAreaSummary.extend({
		boundary: administrativeAreaSummary.shape.boundary.extend({
			geometry: z.object({}).passthrough()
		}),
		nameBBSR: z.string().nullable()
	});

	type AdministrativeAreaComboboxValue = {
		boundary?: { geometry?: Record<string, unknown>; id: string; type: 'Feature' };
		cityAndMunicipalityTypeBBSR?: string | null;
		geometry?: string;
		nameOSM?: string;
		officialMunicipalityKey?: string | null;
		officialRegionalCode: string;
	};

	interface Props {
		labelledBy?: string;
		onchange: (e: Event) => void;
		value?: AdministrativeAreaComboboxValue;
	}

	let { labelledBy, onchange, value }: Props = $props();

	const combobox = createCombobox({ selected: value });

	async function fetchAdministrativeArea(geometry: string, signal: AbortSignal) {
		const params = new URLSearchParams({ geometry });
		const response = await fetch(`/spatial-feature?${params.toString()}`, { signal });
		if (!response.ok) {
			throw new Error(`Failed to fetch spatial feature: ${response.status}`);
		}

		return administrativeArea.nullable().parse(await response.json());
	}

	const selectedAreaResource = resource(
		[() => value?.geometry],
		async ([geometry], _, { signal }) => {
			if (!geometry) {
				return null;
			}

			return fetchAdministrativeArea(geometry, signal);
		}
	);

	let filterCache =
		$combobox.filter.replace(/^(\s*Landkreis|Kreis)\s+/, '').substring(0, 2) ||
		selectedAreaResource.current?.nameOSM.substring(0, 2) ||
		'';

	let name = $derived.by(() => {
		if ($combobox.filter.replace(/^(\s*Landkreis|Kreis)\s+/, '').length > 1) {
			filterCache = $combobox.filter.replace(/^(\s*Landkreis|Kreis)\s+/, '').substring(0, 2);
		}
		return filterCache;
	});

	const administrativeAreasResource = resource(
		[() => name],
		async ([name], _, { signal }) => {
			if (!name) {
				return [];
			}

			const params = new URLSearchParams({ name });
			const response = await fetch(`/spatial-feature?${params.toString()}`, { signal });
			if (!response.ok) {
				throw new Error(`Failed to fetch spatial features: ${response.status}`);
			}

			return z.array(administrativeAreaSummary).parse(await response.json());
		},
		{ debounce: 300 }
	);

	let previewGeometry = $derived(
		$combobox.active?.boundary?.id ?? $combobox.selected?.boundary?.id
	);
	const previewAreaResource = resource(
		[() => previewGeometry],
		async ([geometry], _, { signal }) => {
			if (!geometry) {
				return null;
			}

			return fetchAdministrativeArea(geometry, signal);
		}
	);

	$effect(() => {
		if (!value?.geometry || !selectedAreaResource.current) {
			return;
		}

		if (selectedAreaResource.current.officialRegionalCode !== value.officialRegionalCode) {
			return;
		}

		if (
			$combobox.selected?.nameOSM &&
			$combobox.selected.officialRegionalCode === value.officialRegionalCode
		) {
			return;
		}

		combobox.set({ selected: selectedAreaResource.current });
		if (!filterCache) {
			filterCache = selectedAreaResource.current.nameOSM.substring(0, 2);
		}
	});
</script>

<div class="dropdown">
	<div class="combobox-input">
		<input
			use:combobox.input
			aria-labelledby={labelledBy}
			autocomplete="off"
			{onchange}
			oninput={(e) => e.stopPropagation()}
			value={$combobox.selected?.nameOSM ?? ''}
		/>
		<ChevronSort />
	</div>

	{#if $combobox.expanded}
		<div class="dropdown-panel">
			<ul use:combobox.items>
				{#each administrativeAreasResource.current?.filter((area) => area.nameOSM
						.toLowerCase()
						.includes($combobox.filter.toLowerCase())) ?? [] as value (value.officialRegionalCode)}
					{@const active = $combobox.active?.officialRegionalCode === value.officialRegionalCode}
					{@const selected =
						$combobox.selected?.officialRegionalCode === value.officialRegionalCode}
					<li class:active use:combobox.item={{ value }}>
						<label>
							<input type="radio" value={value.officialRegionalCode} checked={selected} />
							<span class="truncated">{value.nameOSM}</span>
						</label>
					</li>
				{/each}
			</ul>

			{#if previewAreaResource.current?.boundary}
				{#key previewAreaResource.current.boundary.id}
					<Map feature={previewAreaResource.current.boundary} />
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
		width: 50%;
	}
</style>
