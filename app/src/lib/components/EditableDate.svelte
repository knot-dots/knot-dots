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
			value = event.currentTarget.value;
		} else {
			event.stopPropagation();
		}
	}
</script>

{#if editable}
	{const id = crypto.randomUUID()}
	<label class="label" for={id}>{label}</label>
	<input class="value" {id} {oninput} type="date" {value} />
{:else}
	<span class="label">{label}</span>
	<time class="value" datetime={value}>
		{#if value}
			{$date(new Date(value), { dateStyle: 'medium' })}
		{:else}
			{$_('empty')}
		{/if}
	</time>
{/if}

<style>
	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
	}
</style>
