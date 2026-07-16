<script lang="ts">
	import { _, date } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		label: string;
		value?: string;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();

	function oninput(event: Event & { currentTarget: HTMLInputElement }) {
		if (event.currentTarget.value == '') {
			value = undefined;
		} else if (event.currentTarget.validity.valid) {
			value = new Date(event.currentTarget.value).toISOString();
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
	{const id = crypto.randomUUID()}
	<label class="label" for={id}>{label}</label>
	<input
		class="value"
		{id}
		{oninput}
		type="datetime-local"
		value={value ? datetimeLocalFromDate(new Date(value)) : undefined}
	/>
{:else}
	<span class="label">{label}</span>
	<time class="value" datetime={value}>
		{#if value}
			{$date(new Date(value), { dateStyle: 'medium', timeStyle: 'short' })}
		{:else}
			{$_('empty')}
		{/if}
	</time>
{/if}

<style>
	input[type='datetime-local'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
	}
</style>
