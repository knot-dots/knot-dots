<script lang="ts">
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';
	import { page } from '$app/stores';
	import clickOutside from '$lib/clickOutside';
	import requestSubmit from '$lib/client/requestSubmit';
	import type { AnyContainer, EmptyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: AnyContainer | EmptyContainer;
	export let editable = false;

	const disclosure = createDisclosure({ expanded: false });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	$: organizationOptions = $page.data.organizations.map(({ guid, payload }) => ({
		label: payload.name,
		value: guid
	}));

	$: selectedOrganization = organizationOptions.find(
		({ value }) => container.organization == value
	) as { label: string; value: string };

	$: organizationalUnitOptions = [
		{
			label:
				$page.data.organizations.find(({ guid }) => guid === container.organization)?.payload
					.name ?? '',
			value: null
		},
		...$page.data.organizationalUnits
			.filter(({ organization }) => organization === container.organization)
			.map(({ guid, payload }) => ({
				label: payload.name,
				value: guid
			}))
	];

	$: selectedOrganizationalUnit = organizationalUnitOptions.find(
		({ value }) => container.organizational_unit == value
	);
</script>

<div class="tabular">
	<span class="label">{$_('owned_by')}</span>
	{#if editable && ($ability.can('update', container.payload.type, 'organization') || $ability.can('update', container.payload.type, 'organizational_unit'))}
		<div
			class="dropdown-reference"
			use:popperRef
			use:clickOutside
			on:outsideclick={() => disclosure.close()}
		>
			<button class="dropdown-button" type="button" use:disclosure.button>
				<span class="selected">
					<span class="value">{selectedOrganization.label}</span>
					{#if selectedOrganizationalUnit?.value}
						<span class="value">{selectedOrganizationalUnit.label}</span>
					{/if}
				</span>
				<ChevronUpDown />
			</button>
			{#if $disclosure.expanded}
				<fieldset class="dropdown-panel" use:disclosure.panel use:popperContent={extraOpts}>
					{#each organizationOptions as option (option.value)}
						{#if $ability.can('update', container.payload.type, 'organization')}
							<label class:is-hidden={option.value === container.organization}>
								<input
									type="radio"
									value={option.value}
									bind:group={container.organization}
									on:change={requestSubmit}
								/>
								{option.label}
							</label>
						{/if}
						{#if option.value === container.organization && $ability.can('update', container.payload.type, 'organizational_unit')}
							{#each organizationalUnitOptions as option (option.value)}
								<label>
									<input
										type="radio"
										value={option.value}
										bind:group={container.organizational_unit}
										on:change={requestSubmit}
									/>
									{option.label}
								</label>
							{/each}
						{/if}
					{/each}
				</fieldset>
			{/if}
		</div>
	{:else}
		<ul class="selected">
			<li class="value">{selectedOrganization.label}</li>
			{#if selectedOrganizationalUnit?.value}
				<li class="value">{selectedOrganizationalUnit.label}</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	button {
		border: none;
		padding: 0.75rem 0.25rem 0.75rem 1rem;
	}

	ul {
		padding: 0.75rem 1rem;
	}

	.selected {
		display: block;
	}

	.value {
		display: list-item;
		list-style: none;
		padding: 0;
		text-align: left;
		text-wrap: nowrap;
	}
</style>
