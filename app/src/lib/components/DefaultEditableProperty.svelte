<script lang="ts" generics="T extends string | number">
	import { _, date } from 'svelte-i18n';
	import { z, type ZodType } from 'zod';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { inspectSchema } from '$lib/inspectSchema';
	import { propertyRegistry } from '$lib/models';

	interface Props {
		editable?: boolean;
		schema: ZodType;
		value: T | T[];
	}

	let { editable, schema, value = $bindable() }: Props = $props();

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

{const id = crypto.randomUUID()}
<div class="label" {id}>{$_(propertyRegistry.get(schema)?.label ?? '')}</div>

{#if editable}
	{#if schemaInfo.baseSchema instanceof z.ZodEnum}
		{const options = $derived([
			...(schemaInfo.isRequired
				? []
				: [{ label: $_(propertyRegistry.get(schema)?.emptyLabel ?? 'empty'), value: undefined }]),
			...schemaInfo.baseSchema.options.map((o) => ({ label: $_(String(o)), value: o as T }))
		])}
		{#if Array.isArray(value)}
			<MultipleChoiceDropdown bind:value labelledBy={id} {options} />
		{:else}
			<SingleChoiceDropdown bind:value labelledBy={id} {options} />
		{/if}
	{:else if schemaInfo.baseSchema instanceof z.ZodStringFormat}
		{#if schemaInfo.baseSchema.def.format == 'date'}
			<input aria-labelledby={id} oninput={handleDateInput} type="date" {value} />
		{:else if schemaInfo.baseSchema.def.format == 'datetime'}
			<input
				aria-labelledby={id}
				oninput={handleDatetimeInput}
				type="datetime-local"
				value={value ? datetimeLocalFromDate(new Date(value as string)) : undefined}
			/>
		{:else if schemaInfo.baseSchema.def.format == 'url'}
			<input aria-labelledby={id} bind:value type="url" />
		{/if}
	{:else if schemaInfo.baseSchema instanceof z.ZodString}
		<input aria-labelledby={id} bind:value {...schemaInfo.constraints} type="text" />
	{:else if schemaInfo.baseSchema instanceof z.ZodNumber}
		<input aria-labelledby={id} bind:value {...schemaInfo.constraints} type="number" />
	{/if}
{:else}
	{#if value === undefined}
		<div class="value">{$_(propertyRegistry.get(schema)?.emptyLabel ?? 'empty')}</div>
	{:else if Array.isArray(value)}
		{#if schemaInfo.baseSchema instanceof z.ZodEnum}
			<ul class="value">
				{#each value as v (v)}
					<li class="truncated">{$_(String(v))}</li>
				{/each}
			</ul>
		{/if}
	{:else if schemaInfo.baseSchema instanceof z.ZodEnum}
		<div class="value">{$_(String(value))}</div>
	{:else if schemaInfo.baseSchema instanceof z.ZodStringFormat && schemaInfo.baseSchema.def.format == 'date'}
		<div class="value">{$date(new Date(value), { dateStyle: 'medium' })}</div>
	{:else if schemaInfo.baseSchema instanceof z.ZodStringFormat && schemaInfo.baseSchema.def.format == 'datetime'}
		<div class="value">{$date(new Date(value), { dateStyle: 'medium', timeStyle: 'short' })}</div>
	{:else}
		<div class="value">{value}</div>
	{/if}
{/if}
