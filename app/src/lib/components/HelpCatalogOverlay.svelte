<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Catalog from '$lib/components/Catalog.svelte';
	import Header from '$lib/components/Header.svelte';
	import { payloadTypes, type HelpContainer, type HelpSlug } from '$lib/models';

	interface Props {
		containers: HelpContainer[];
		slug: HelpSlug;
	}

	let { containers, slug }: Props = $props();
</script>

<Header workspaceOptions={[]} />

{#if containers.length > 0}
	<Catalog {containers} payloadType={[payloadTypes.enum.help]} hideCreateButton={true} />
{:else}
	<div class="empty-state" data-help-slug={slug}>
		<h2>{$_('help_catalog.empty')}</h2>
	</div>
{/if}

<style>
	.empty-state {
		padding: 3.5rem 5rem;
	}

	.empty-state h2 {
		color: var(--color-gray-700);
		margin: 0;
	}
</style>
