<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import {
		type AnyPayload,
		type Container,
		isContainerWithName,
		isContainerWithTitle
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
	}

	let { container = $bindable(), editable = false }: Props = $props();
</script>

{#if isContainerWithTitle(container)}
	{#if editable}
		<AutoresizingTextarea
			aria-label={$_('title')}
			placeholder={$_('title')}
			required
			rows={1}
			bind:value={container.payload.title}
		/>
	{:else}
		{container.payload.title}
	{/if}
{:else if isContainerWithName(container)}
	{#if editable}
		<AutoresizingTextarea
			aria-label={$_('name')}
			placeholder={$_('name')}
			required
			rows={1}
			bind:value={container.payload.name}
		/>
	{:else}
		{container.payload.name}
	{/if}
{/if}
