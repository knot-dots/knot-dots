<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<p>
	{#if editable}
		<label>
			{$_('image_source')}:
			<input bind:value name="imageSource" type="text" />
		</label>
	{:else if value}
		{$_('image_source')}: {value}
	{/if}
</p>

<style>
	p {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 400;
		margin: 0.5rem 0;
	}

	label {
		color: inherit;
		font-size: inherit;
		font-weight: inherit;
	}

	input {
		border: none;
		border-radius: 4px;
		display: inline;
		color: inherit;
		field-sizing: content;
		font-size: inherit;
		font-weight: inherit;
		padding: 0.125rem 0.25rem;
		width: fit-content;
	}
</style>
