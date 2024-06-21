<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { ability } from '$lib/stores';
	import type { AnyContainer, EmptyContainer } from '$lib/models';

	export let container: AnyContainer | EmptyContainer;
</script>

{#if $ability.can('update', container.payload.type, 'organization')}
	<label>
		{$_('organization')}
		<select bind:value={container.organization}>
			{#each $page.data.organizations as organizationOption}
				<option value={organizationOption.guid}>
					{organizationOption.payload.name}
				</option>
			{/each}
		</select>
	</label>
{/if}

{#if $ability.can('update', container.payload.type, 'organizational_unit')}
	<label>
		{$_('organizational_unit')}
		<select bind:value={container.organizational_unit}>
			<option value={null}>
				{$page.data.organizations.find(({ guid }) => guid == container.organization)?.payload
					.name ?? ''}
			</option>
			{#each $page.data.organizationalUnits as organizationalUnitOption}
				{#if organizationalUnitOption.organization === container.organization}
					<option value={organizationalUnitOption.guid}>
						{organizationalUnitOption.payload.name}
					</option>
				{/if}
			{/each}
		</select>
	</label>
{/if}
