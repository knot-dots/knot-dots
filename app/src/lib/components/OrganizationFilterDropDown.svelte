<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import ChevronDownSmall from '~icons/heroicons/chevron-down-16-solid';
	import ChevronUpSmall from '~icons/heroicons/chevron-up-16-solid';
	import LightningBolt from '~icons/knotdots/lightning-bolt';

	type Option = {
		count: number;
		value: string;
		label: string;
		subOptions: Option[];
	};

	interface Props {
		mode: 'select' | 'apply_rule';
		options: Option[];
		organizationValue: string[];
		organizationalUnitValue: string[];
	}

	let {
		mode,
		options,
		organizationValue = $bindable(),
		organizationalUnitValue = $bindable()
	}: Props = $props();

	let totalSelected = $derived(organizationValue.length + organizationalUnitValue.length);

	const popover = createPopover({ label: $_('organization') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [
			{
				name: 'offset',
				options: { offset: [0, 4] }
			}
		]
	};

	let expandedOrgs = $state<Set<string>>(new Set());

	function toggleOrg(orgGuid: string, checked: boolean) {
		if (checked) {
			organizationValue = organizationValue.includes(orgGuid)
				? organizationValue
				: [...organizationValue, orgGuid];
		} else {
			organizationValue = organizationValue.filter((v) => v !== orgGuid);
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
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		{#if totalSelected > 0 && mode == 'apply_rule'}
			<LightningBolt />
		{/if}
		<span>{$_('organization')}</span>
		{#if totalSelected > 0}
			<span class="indicator">{totalSelected}</span>
		{/if}
		{#if $popover.expanded}<ChevronUp />{:else}<ChevronDown />{/if}
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={extraOpts} use:popover.panel>
			<div>
				{#each options as org (org.value)}
					<div class="option" role="presentation">
						<label>
							<input
								type="checkbox"
								value={org.value}
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
									<ChevronUpSmall />
								{:else}
									<ChevronDownSmall />
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
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-default-background: transparent;
		--dropdown-button-active-background: var(--color-primary-100);
		--dropdown-button-hover-background: var(--color-primary-100);
		--dropdown-button-expanded-background: var(--color-primary-100);
		--dropdown-button-expanded-color: var(--color-primary-700);
		--dropdown-button-border-radius: 8px;
		--dropdown-panel-max-height: calc(100vh - 12rem);

		position: static;
	}

	.dropdown-panel {
		max-width: min(24rem, calc(100cqw - 3rem));
		z-index: 2;
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

	.truncated {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.suboptions-list {
		display: flex;
		flex-direction: column;
		padding: 0.25rem 0 0.5rem 1.5rem;
	}
</style>
