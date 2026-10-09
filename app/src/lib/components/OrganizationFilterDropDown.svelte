<script lang="ts">
	import { _ } from 'svelte-i18n';
	import LightningBolt from '~icons/knotdots/lightning-bolt';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import MultipleChoiceTree, {
		type MultipleChoiceTreeOption
	} from '$lib/components/MultipleChoiceTree.svelte';

	interface Props {
		allowAll?: boolean;
		mode: 'select' | 'apply_rule';
		options: MultipleChoiceTreeOption[];
		scope: 'current' | 'all' | 'explicit';
		includeSubordinateOrganizationalUnits: boolean;
		organizationValue: string[];
		organizationalUnitValue: string[];
	}

	let {
		allowAll = false,
		mode,
		options,
		scope = $bindable(),
		includeSubordinateOrganizationalUnits = $bindable(),
		organizationValue = $bindable(),
		organizationalUnitValue = $bindable()
	}: Props = $props();

	let totalSelected = $derived(organizationValue.length + organizationalUnitValue.length);

	// The tree works on one flat selection; it is split back into
	// organizations and organizational units, and unchecking an organization
	// takes its units along.
	function setSelection(selected: string[]) {
		const organizations = options
			.filter(({ value }) => selected.includes(value))
			.map(({ value }) => value);
		const droppedOrganizations = organizationValue.filter(
			(value) => !organizations.includes(value)
		);
		const droppedUnits = options
			.filter(({ value }) => droppedOrganizations.includes(value))
			.flatMap(({ subOptions }) => subOptions ?? [])
			.map(({ value }) => value);
		organizationValue = organizations;
		organizationalUnitValue = options
			.flatMap(({ subOptions }) => subOptions ?? [])
			.map(({ value }) => value)
			.filter((value) => selected.includes(value) && !droppedUnits.includes(value));
	}

	function resetAll() {
		organizationValue = [];
		organizationalUnitValue = [];
	}

	const disabled = $derived(scope !== 'explicit');
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
			{#if allowAll}
				<label class="scope-option">
					<input type="radio" value="all" bind:group={scope} />
					<span>{$_('organization_filter.all')}</span>
				</label>
			{/if}
			<label class="scope-option">
				<input type="radio" value="explicit" bind:group={scope} />
				<span>{$_('organization_filter.explicit')}</span>
			</label>
		</div>

		<div class="option-list" class:option-list--disabled={disabled}>
			<div class="list-section-title">
				<span class="section-label">{$_('organization_filter.select')}</span>
				<button type="button" class="text-button text-button--reset" onclick={resetAll}>
					{$_('organization_filter.reset')}
				</button>
			</div>
			<MultipleChoiceTree
				{disabled}
				{options}
				bind:selected={() => [...organizationValue, ...organizationalUnitValue], setSelection}
			/>
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
</style>
