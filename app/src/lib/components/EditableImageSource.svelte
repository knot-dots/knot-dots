<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		editable?: boolean;
		value?: string;
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
		align-items: center;
		color: inherit;
		display: flex;
		font-size: inherit;
		font-weight: inherit;
		width: 100%;
	}

	input {
		border: none;
		border-radius: 4px;
		display: inline;
		color: inherit;
		font-size: inherit;
		font-weight: inherit;
		padding: 0.125rem 0.25rem;
	}
</style>
