<script lang="ts">
	import { _ } from 'svelte-i18n';
	import LinkStyleDropdown from '$lib/components/LinkStyleDropdown.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		value: string | undefined;
	}

	let { editable = false, label, value = $bindable() }: Props = $props();
</script>

{#if label}
	<div class="label">{label}</div>
{/if}
{#if editable}
	<LinkStyleDropdown {editable} bind:value />
{:else}
	<div class="value">
		{$_(`link_style.${value}`) ?? $_('empty')}
	</div>
{/if}
