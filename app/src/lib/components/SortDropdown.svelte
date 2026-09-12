<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowsUpDown from '~icons/heroicons/arrows-up-down-16-solid';
	import Dropdown from '$lib/components/Dropdown.svelte';

	interface Props {
		options: Array<{ href?: string; label: string; value: string | undefined }>;
		value: string | null | undefined;
	}

	let { options, value = $bindable() }: Props = $props();

	let selected = $derived(options.find((o) => o.value == value));
</script>

<Dropdown label={$_('sort')} offset={[0, 4]}>
	{#snippet button(popover)}
		<button class="dropdown-button dropdown-button--select" type="button" use:popover.button>
			<ArrowsUpDown />{#if selected}{selected.label}{:else}&nbsp;{/if}
		</button>
	{/snippet}

	{#snippet panel()}
		<fieldset class="listbox" oninput={(e) => e.stopPropagation()}>
			{#each options as option (option.value)}
				<label>
					<input type="radio" value={option.value} bind:group={value} />
					{option.label}
				</label>
			{/each}
		</fieldset>
	{/snippet}
</Dropdown>
