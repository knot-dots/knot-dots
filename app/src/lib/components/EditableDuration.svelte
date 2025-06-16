<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import type { ContainerWithEffect } from '$lib/models';

	interface Props {
		container: ContainerWithEffect;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

{#if editable}
	<div class="label">{$_('planned_duration')}</div>
	<fieldset>
		<label class="is-visually-hidden" for="startDate">
			{$_('start_date')}
		</label>
		<input class="value" id="startDate" type="date" bind:value={container.payload.startDate} />
		–
		<label class="is-visually-hidden" for="endDate">
			{$_('end_date')}
		</label>
		<input class="value" id="endDate" type="date" bind:value={container.payload.endDate} />
	</fieldset>
{:else}
	<div class="label">{$_('planned_duration')}</div>
	<div class="value">
		{#if container.payload.startDate && container.payload.endDate}
			{$date(new Date(container.payload.startDate), { format: 'long' })}–{$date(
				new Date(container.payload.endDate),
				{ format: 'long' }
			)}
		{:else if container.payload.startDate}
			{$date(new Date(container.payload.startDate), { format: 'long' })}–
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
