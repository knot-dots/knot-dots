<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import type { EmptyResolutionContainer, ResolutionContainer } from '$lib/models';

	interface Props {
		container: ResolutionContainer | EmptyResolutionContainer;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

{#if editable}
	<div class="label">{$_('valid_from')}</div>
	<fieldset>
		<label class="is-visually-hidden" for="startDate">
			{$_('valid_from')}
		</label>
		<input class="value" id="startDate" type="date" bind:value={container.payload.validFrom} />
		–
		<label class="is-visually-hidden" for="endDate">
			{$_('valid_until')}
		</label>
		<input class="value" id="endDate" type="date" bind:value={container.payload.validUntil} />
	</fieldset>
{:else}
	<div class="label">{$_('valid_from')}</div>
	<div class="value">
		{#if container.payload.validFrom && container.payload.validUntil}
			{$date(new Date(container.payload.validFrom), { format: 'long' })}–{$date(
				new Date(container.payload.validUntil),
				{ format: 'long' }
			)}
		{:else if container.payload.validFrom}
			{$date(new Date(container.payload.validFrom), { format: 'long' })}
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
		width: auto;
	}
</style>
