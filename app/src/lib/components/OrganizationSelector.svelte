<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ListBox from '$lib/components/ListBox.svelte';
	import type { AnyContainer, EmptyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: AnyContainer | EmptyContainer;
</script>

{#if $ability.can('update', container.payload.type, 'organization')}
	<ListBox
		label={$_('organization')}
		options={$page.data.organizations.map(({ guid, payload }) => ({
			value: guid,
			label: payload.name
		}))}
		bind:value={container.organization}
	/>
{/if}

{#if $ability.can('update', container.payload.type, 'organizational_unit') && $page.data.organizationalUnits.length > 0}
	<ListBox
		label={$_('organizational_unit')}
		options={[
			{
				value: null,
				label:
					$page.data.organizations.find(({ guid }) => guid === container.organization)?.payload
						.name ?? ''
			},
			...$page.data.organizationalUnits.map(({ guid, payload }) => ({
				value: guid,
				label: payload.name
			}))
		]}
		bind:value={container.organizational_unit}
	/>
{/if}
