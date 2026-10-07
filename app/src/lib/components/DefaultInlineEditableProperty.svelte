<script lang="ts" generics="T extends string | number">
	import { _, date } from 'svelte-i18n';
	import { z, type ZodType } from 'zod';
	import CalendarMonth from '~icons/flowbite/calendar-month-outline';
	import tooltip from '$lib/attachments/tooltip';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { inspectSchema } from '$lib/inspectSchema';
	import { propertyRegistry } from '$lib/models';

	interface Props {
		editable?: boolean;
		schema: ZodType;
		value: T | T[];
	}

	let { editable = false, schema, value = $bindable() }: Props = $props();

	const schemaInfo = $derived(inspectSchema(schema));

	function handleDateInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (event.currentTarget.value == '') {
			(value as string | undefined) = undefined;
		} else if (event.currentTarget.validity.valid) {
			(value as string | undefined) = event.currentTarget.value;
		} else {
			event.stopPropagation();
		}
	}

	function handleDatetimeInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (event.currentTarget.value == '') {
			(value as string | undefined) = undefined;
		} else if (event.currentTarget.validity.valid) {
			(value as string | undefined) = new Date(event.currentTarget.value).toISOString();
		} else {
			event.stopPropagation();
		}
	}

	function datetimeLocalFromDate(dt: Date) {
		dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
		return dt.toISOString().slice(0, 16);
	}
</script>

{#if editable}
	{#if schemaInfo.baseSchema instanceof z.ZodEnum}
		{#if Array.isArray(value)}
			{const options = schemaInfo.baseSchema.options.map((o) => ({
				label: $_(String(o)),
				value: o as T
			}))}
			{const selected = $derived(options.filter((o) => (value as T[]).includes(o.value)))}
			<MultipleChoiceDropdown bind:value compact {options}>
				{#snippet button(popover)}
					<button
						{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
						class="dropdown-button dropdown-button--select"
						type="button"
						use:popover.button
					>
						{#each selected as selectedOption (selectedOption.value)}
							<span class="badge badge--large">
								<span class="truncated">{selectedOption.label}</span>
							</span>
						{:else}
							<span class="badge badge--large">{$_('empty')}</span>
						{/each}
					</button>
				{/snippet}
			</MultipleChoiceDropdown>
		{:else}
			{const options = $derived([
				...(schemaInfo.isRequired
					? []
					: [{ label: $_(propertyRegistry.get(schema)?.emptyLabel ?? 'empty'), value: undefined }]),
				...schemaInfo.baseSchema.options.map((o) => ({ label: $_(String(o)), value: o as T }))
			])}
			{const selected = $derived(options.find((o) => o.value == value))}
			<SingleChoiceDropdown bind:value {options}>
				{#snippet button(popover)}
					<button
						{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
						class="dropdown-button"
						type="button"
						use:popover.button
					>
						<span class="badge badge--large">
							<span class="truncated">
								{#if selected}{selected.label}{:else}{$_('empty')}{/if}
							</span>
						</span>
					</button>
				{/snippet}
			</SingleChoiceDropdown>
		{/if}
	{:else if schemaInfo.baseSchema instanceof z.ZodStringFormat}
		{#if schemaInfo.baseSchema.def.format == 'date'}
			<input
				{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
				oninput={handleDateInput}
				type="date"
				{value}
			/>
		{:else if schemaInfo.baseSchema.def.format == 'datetime'}
			<input
				{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
				oninput={handleDatetimeInput}
				type="datetime-local"
				value={value ? datetimeLocalFromDate(new Date(value as string)) : undefined}
			/>
		{:else if schemaInfo.baseSchema.def.format == 'url'}
			<input
				{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
				bind:value
				type="url"
			/>
		{/if}
	{:else if schemaInfo.baseSchema instanceof z.ZodString}
		<input
			{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
			bind:value
			{...schemaInfo.constraints}
			type="text"
		/>
	{:else if schemaInfo.baseSchema instanceof z.ZodNumber}
		<input
			{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
			bind:value
			{...schemaInfo.constraints}
			type="number"
		/>
	{/if}
{:else}
	{#if value === undefined}
		{#if propertyRegistry.get(schema)?.emptyLabel}
			<span
				{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
				class="badge badge--large"
			>
				{$_(propertyRegistry.get(schema)?.emptyLabel as string)}
			</span>
		{/if}
	{:else if Array.isArray(value)}
		{#if schemaInfo.baseSchema instanceof z.ZodEnum}
			<ul {@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}>
				{#each value as v (v)}
					<li class="badge badge--large">
						<span class="truncated">{$_(String(v))}</span>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if schemaInfo.baseSchema instanceof z.ZodEnum}
		<span
			{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
			class="badge badge--large"
		>
			{$_(String(value))}
		</span>
	{:else if schemaInfo.baseSchema instanceof z.ZodStringFormat && schemaInfo.baseSchema.def.format == 'date'}
		<span
			{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
			class="badge badge--large"
		>
			<CalendarMonth />
			{$date(new Date(value), { dateStyle: 'medium' })}
		</span>
	{:else if schemaInfo.baseSchema instanceof z.ZodStringFormat && schemaInfo.baseSchema.def.format == 'datetime'}
		<span
			{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
			class="badge badge--large"
		>
			<CalendarMonth />
			{$date(new Date(value), { dateStyle: 'medium', timeStyle: 'short' })}
		</span>
	{:else}
		<span
			{@attach tooltip($_(propertyRegistry.get(schema)?.label ?? ''))}
			class="badge badge--large"
		>
			{value}
		</span>
	{/if}
{/if}

<style>
	ul {
		display: flex;
		gap: 0.125rem;
	}

	input {
		width: fit-content;
	}
</style>
