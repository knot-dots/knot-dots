<script lang="ts">
	import CheckIcon from '~icons/flowbite/check-outline';
	import MinusIcon from '~icons/flowbite/minus-outline';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		ariaLabel: string;
		checked: boolean;
		// an editable box that cannot be toggled yet, e.g. in a row being added
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
		state: 'editable' | 'readonly' | 'inactive';
		tooltip?: string;
	}

	let {
		ariaLabel,
		checked,
		disabled = false,
		onchange,
		state,
		tooltip: tooltipText
	}: Props = $props();
</script>

{#if state === 'editable'}
	<span class="permission-checkbox permission-checkbox--editable">
		<input
			aria-label={ariaLabel}
			{checked}
			{disabled}
			type="checkbox"
			onchange={(event) => onchange?.(event.currentTarget.checked)}
		/>
	</span>
{:else if state === 'readonly'}
	<!-- a cell with a tooltip takes focus so the keyboard reaches the hint -->
	<span
		aria-label={ariaLabel}
		class="permission-checkbox"
		class:permission-checkbox--granted={checked}
		class:permission-checkbox--not-granted={!checked}
		role="img"
		tabindex={tooltipText ? 0 : undefined}
		{@attach tooltipText ? tooltip(tooltipText, { describe: true }) : undefined}
	>
		{#if checked}<CheckIcon />{:else}<MinusIcon />{/if}
	</span>
{:else if checked}
	<!-- an unset inactive cell stays empty -->
	<span
		aria-label={ariaLabel}
		class="permission-checkbox permission-checkbox--dormant"
		role="img"
		tabindex={tooltipText ? 0 : undefined}
		{@attach tooltipText ? tooltip(tooltipText, { describe: true }) : undefined}
	>
		<CheckIcon />
	</span>
{/if}

<style>
	.permission-checkbox {
		align-items: center;
		border-radius: 8px;
		display: inline-flex;
		height: 24px;
		justify-content: center;
		width: 24px;
	}

	.permission-checkbox--editable:hover {
		background-color: var(--color-background-accent-hover);
	}

	.permission-checkbox--editable:hover input:not(:checked) {
		border-color: var(--color-border-accent-strong);
	}

	.permission-checkbox--editable:has(input:focus-visible),
	.permission-checkbox:focus-visible {
		outline: 2px solid var(--color-border-focus);
		outline-offset: -2px;
	}

	input {
		appearance: none;
		background-color: var(--color-surface-container);
		border: 1px solid var(--color-border-default);
		border-radius: 4px;
		height: 16px;
		margin: 0;
		width: 16px;
	}

	input:focus-visible {
		outline: none;
	}

	input:checked {
		background-color: var(--color-accent-on-default);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2 6.5L4.5 9L10 3.5' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-position: center;
		background-repeat: no-repeat;
		background-size: 0.625rem;
		border-color: var(--color-accent-on-default);
	}

	.permission-checkbox :global(svg) {
		height: 16px;
		width: 16px;
	}

	.permission-checkbox--granted {
		color: var(--color-icon-default);
	}

	.permission-checkbox--not-granted {
		color: var(--color-icon-disabled);
	}

	.permission-checkbox--dormant {
		color: var(--color-icon-muted);
	}
</style>
