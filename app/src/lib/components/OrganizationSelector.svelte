<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ListBox from '$lib/components/ListBox.svelte';
	import type { AnyContainer, EmptyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: AnyContainer | EmptyContainer;
</script>

{#if $ability.can('update', container.payload.type, 'organization')}
	<div class="meta">
		<p class="meta-key">{$_('organization')}</p>
		<div class="meta-value">
			<ListBox
				label={$_('organization')}
				options={$page.data.organizations.map(({ guid, payload }) => ({
					value: guid,
					label: payload.name
				}))}
				bind:value={container.organization}
			/>
		</div>
	</div>
{/if}

{#if $ability.can('update', container.payload.type, 'organizational_unit') && $page.data.organizationalUnits.length > 0}
	<div class="meta">
		<p class="meta-key">{$_('organizational_unit')}</p>
		<div class="meta-value">
			<ListBox
				label={$_('organizational_unit')}
				options={[
					{
						value: null,
						label:
							$page.data.organizations.find(({ guid }) => guid === container.organization)?.payload
								.name ?? ''
					},
					...$page.data.organizationalUnits
						.filter(({ organization }) => organization === container.organization)
						.map(({ guid, payload }) => ({
							value: guid,
							label: payload.name
						}))
				]}
				bind:value={container.organizational_unit}
			/>
		</div>
	</div>
{/if}
