<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Background from '~icons/knotdots/background';
	import Dropdown from '$lib/components/Dropdown.svelte';
	import { type BackgroundColor, backgroundColor } from '$lib/models';
	import { backgroundColors } from '$lib/theme/models';

	interface Props {
		buttonStyle?: 'button' | 'default';
		editable?: boolean;
		offset?: [number, number];
		label: string;
		value?: BackgroundColor;
	}

	let {
		buttonStyle = 'default',
		editable = false,
		label,
		offset,
		value = $bindable()
	}: Props = $props();
</script>

{#if editable}
	<Dropdown {offset}>
		{#snippet button(popover)}
			<label class="button action-button action-button--size-l" use:popover.button>
				{#if buttonStyle === 'button'}
					<Background /> {label}
				{:else}
					<Background />
					{label}
				{/if}
			</label>
		{/snippet}

		{#snippet panel()}
			<fieldset class="listbox">
				{#each backgroundColor.options.map( (o) => ({ label: $_(o), value: o }) ) as option (option.value)}
					<label>
						<input type="radio" name="color" value={option.value} bind:group={value} />
						<span class="stage stage--color stage--{backgroundColors.get(option.value)}">
							&nbsp;
						</span>
						{option.label}
					</label>
				{/each}
			</fieldset>
		{/snippet}
	</Dropdown>
{/if}
