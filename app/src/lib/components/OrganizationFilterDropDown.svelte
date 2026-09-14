<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import Dropdown from '$lib/components/Dropdown.svelte';

	type Option = {
		count: number;
		value: string;
		label: string;
		subOptions: Option[];
	};

	interface Props {
		mode: 'select' | 'apply_rule';
		options: Option[];
		scope: 'current' | 'explicit';
		includeSubordinateOrganizationalUnits: boolean;
		organizationValue: string[];
		organizationalUnitValue: string[];
	}

	let {
		mode,
		options,
		scope = $bindable(),
		includeSubordinateOrganizationalUnits = $bindable(),
		organizationValue = $bindable(),
		organizationalUnitValue = $bindable()
	}: Props = $props();

	let totalSelected = $derived(organizationValue.length + organizationalUnitValue.length);

	let expandedOrgs = $state<Set<string>>(new Set());

	function toggleOrg(orgGuid: string, checked: boolean) {
		if (checked) {
			organizationValue = organizationValue.includes(orgGuid)
				? organizationValue
				: [...organizationValue, orgGuid];
		} else {
			organizationValue = organizationValue.filter((v) => v !== orgGuid);
			// Remove organizational units belonging to this org
			const orgOption = options.find((o) => o.value === orgGuid);
			if (orgOption) {
				const organizationalUnitGuids = orgOption.subOptions.map(
					(organizationalUnit) => organizationalUnit.value
				);
				organizationalUnitValue = organizationalUnitValue.filter(
					(v) => !organizationalUnitGuids.includes(v)
				);
			}
		}
	}

	function toggleOrganizationalUnit(organizationalUnitGuid: string, checked: boolean) {
		if (checked) {
			organizationalUnitValue = organizationalUnitValue.includes(organizationalUnitGuid)
				? organizationalUnitValue
				: [...organizationalUnitValue, organizationalUnitGuid];
		} else {
			organizationalUnitValue = organizationalUnitValue.filter((v) => v !== organizationalUnitGuid);
		}
	}

	function toggleExpanded(orgGuid: string) {
		if (expandedOrgs.has(orgGuid)) {
			expandedOrgs.delete(orgGuid);
		} else {
			expandedOrgs.add(orgGuid);
		}
		expandedOrgs = new Set(expandedOrgs);
	}

	function resetAll() {
		organizationValue = [];
		organizationalUnitValue = [];
	}

	const disabled = $derived(scope === 'current');
</script>

<Dropdown
	--dropdown-position="static"
	--dropdown-button-default-background="transparent"
	--dropdown-button-active-background="var(--color-primary-100)"
	--dropdown-button-hover-backgroun="var(--color-primary-100)"
	--dropdown-button-expanded-background="(--color-primary-100)"
	--dropdown-button-expanded-color="var(--color-primary-700)"
	--dropdown-panel-max-height="calc(100vh - 12rem)"
	--dropdown-panel-max-width="min(24rem, calc(100cqw - 3rem))"
	label={$_('organization')}
	offset={[0, 4]}
>
	{#snippet button(popover)}
		<button class="dropdown-button dropdown-button--select" type="button" use:popover.button>
			{#if scope === 'explicit' && totalSelected > 0 && mode == 'apply_rule'}
				<LightningBolt />
			{/if}
			<span>{$_('organization')}</span>
			{#if scope === 'explicit' && totalSelected > 0}
				<span class="indicator">{totalSelected}</span>
			{/if}
		</button>
	{/snippet}

	{#snippet panel()}
		<div class="listbox scope-options" role="radiogroup">
			<label class="scope-option">
				<input type="radio" value="current" bind:group={scope} />
				<span>{$_('organization_filter.current')}</span>
			</label>
			<label class="toggle-option" class:toggle-option--disabled={scope !== 'current'}>
				<span>{$_('organization_filter.exclude_subordinate')}</span>
				<input
					type="checkbox"
					class="toggle"
					disabled={scope !== 'current'}
					bind:checked={
						() => !includeSubordinateOrganizationalUnits,
						(v) => (includeSubordinateOrganizationalUnits = !v)
					}
				/>
			</label>
			<label class="scope-option">
				<input type="radio" value="explicit" bind:group={scope} />
				<span>{$_('organization_filter.explicit')}</span>
			</label>
		</div>

		<div class="listbox option-list" class:option-list--disabled={disabled}>
			<div class="list-section-title">
				<span class="section-label">{$_('organization_filter.select')}</span>
				<button type="button" class="text-button text-button--reset" onclick={resetAll}>
					{$_('organization_filter.reset')}
				</button>
			</div>
			{#each options as org (org.value)}
				<div class="option" role="presentation">
					<label>
						<input
							type="checkbox"
							value={org.value}
							{disabled}
							checked={organizationValue.includes(org.value)}
							onchange={(event) =>
								toggleOrg(org.value, (event.currentTarget as HTMLInputElement).checked)}
						/>
						<span class="option-label">
							<span class="truncated">{org.label}</span>
							{#if org.count !== undefined}
								<span class="counter">({org.count})</span>
							{/if}
						</span>
					</label>
					{#if org.subOptions.length > 0}
						<button
							type="button"
							class="action-button action-button--size-l suboption-button"
							onclick={() => toggleExpanded(org.value)}
						>
							<span
								class="suboption-dot"
								class:suboption-dot--active={org.subOptions.some((organizationalUnit) =>
									organizationalUnitValue.includes(organizationalUnit.value)
								)}
								aria-hidden="true"
							></span>
							{#if expandedOrgs.has(org.value)}
								<ChevronUp />
							{:else}
								<ChevronDown />
							{/if}
						</button>
					{/if}
				</div>
				{#if org.subOptions.length > 0 && expandedOrgs.has(org.value)}
					<div class="suboptions-list" role="presentation">
						{#each org.subOptions as organizationalUnit (organizationalUnit.value)}
							<label class="option option--suboption">
								<input
									type="checkbox"
									value={organizationalUnit.value}
									{disabled}
									checked={organizationalUnitValue.includes(organizationalUnit.value)}
									onchange={(event) =>
										toggleOrganizationalUnit(
											organizationalUnit.value,
											(event.currentTarget as HTMLInputElement).checked
										)}
								/>
								<span class="option-label">
									<span class="truncated">{organizationalUnit.label}</span>
									{#if organizationalUnit.count !== undefined}
										<span class="counter">({organizationalUnit.count})</span>
									{/if}
								</span>
							</label>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/snippet}
</Dropdown>

<style>
	.scope-options {
		border-bottom: solid 1px var(--color-gray-200);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.scope-option {
		align-items: center;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
	}

	.scope-options label.toggle-option {
		align-items: center;
		cursor: pointer;
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
		padding: 0.5rem 0.5rem 0.5rem 2rem;
	}

	.scope-options label.toggle-option--disabled {
		cursor: default;
		opacity: 0.5;
	}

	.toggle-option > .toggle {
		--height: 1rem;

		flex-shrink: 0;
	}

	.option-list--disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.list-section-title {
		align-items: center;
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0.5rem 0.25rem;
	}

	.section-label {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 500;
	}

	.text-button {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		display: inline-flex;
		font-weight: 500;
		justify-content: center;
	}

	.text-button--reset {
		color: var(--color-red-700);
		font-size: 0.75rem;
		height: 28px;
		padding: 0 0.625rem;
	}

	.text-button--reset:hover {
		background-color: var(--color-red-050);
	}

	.counter {
		color: var(--color-gray-500);
	}

	.suboption-button {
		align-items: center;
		display: inline-flex;
		margin-left: auto;
		position: relative;
	}

	.suboption-dot {
		background-color: transparent;
		border-radius: 50%;
		height: 0.5rem;
		position: absolute;
		right: 0;
		top: 0;
		width: 0.5rem;
	}

	.suboption-dot--active {
		background-color: var(--color-primary-700);
	}

	.option {
		display: flex;
		align-items: center;
	}

	.option > label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	.option-label {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		min-width: 0;
	}

	.option--suboption {
		opacity: 0.85;
	}

	.suboptions-list {
		display: flex;
		flex-direction: column;
		padding: 0.25rem 0 0.5rem 1.5rem;
	}
</style>
