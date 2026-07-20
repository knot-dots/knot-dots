<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import type { Container, MeasurePayload, SimpleMeasurePayload } from '$lib/models';

	interface Props {
		container: Container<MeasurePayload | SimpleMeasurePayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();

	function oninput(key: 'startDate' | 'endDate') {
		return (event: Event & { currentTarget: HTMLInputElement }) => {
			if (event.currentTarget.value == '') {
				container.payload[key] = undefined;
			} else if (event.currentTarget.validity.valid) {
				container.payload[key] = event.currentTarget.value;
			} else {
				event.stopPropagation();
			}
		};
	}
</script>

{#if editable}
	<div class="label">{$_('planned_duration')}</div>
	<fieldset>
		<label class="is-visually-hidden" for="startDate">
			{$_('start_date')}
		</label>
		<input
			class="value"
			id="startDate"
			oninput={oninput('startDate')}
			type="date"
			value={container.payload.startDate}
		/>
		–
		<label class="is-visually-hidden" for="endDate">
			{$_('end_date')}
		</label>
		<input
			class="value"
			id="endDate"
			oninput={oninput('endDate')}
			type="date"
			value={container.payload.endDate}
		/>
	</fieldset>
{:else}
	<div class="label">{$_('planned_duration')}</div>
	<div class="value">
		{#if container.payload.startDate && container.payload.endDate}
			{$date(new Date(container.payload.startDate), { dateStyle: 'medium' })}–{$date(
				new Date(container.payload.endDate),
				{ format: 'long' }
			)}
		{:else if container.payload.startDate}
			{$date(new Date(container.payload.startDate), { dateStyle: 'medium' })}–
		{:else}
			{$_('empty')}
		{/if}
	</div>
{/if}

<style>
	fieldset {
		border: none;
		padding: 0;
	}

	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
		padding: 0.375rem;
		width: auto;
	}
</style>
