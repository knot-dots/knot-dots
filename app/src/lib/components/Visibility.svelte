<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ability } from '$lib/stores';
	import { visibility } from '$lib/models';
	import type { AnyContainer, EmptyContainer } from '$lib/models';

	export let container: AnyContainer | EmptyContainer;
</script>

{#if $ability.can('update', container, 'visibility')}
	<fieldset>
		<legend>{$_('visibility.label')}</legend>
		{#each visibility.options as visibilityOption}
			<label>
				<input
					form="container-form"
					type="radio"
					name="visibility"
					value={visibilityOption}
					bind:group={container.payload.visibility}
				/>
				{$_(`visibility.${visibilityOption}`)}
			</label>
		{/each}
	</fieldset>
{/if}

<style>
	fieldset {
		align-items: center;
		border: none;
		color: var(--color-gray-600);
		display: flex;
		font-weight: 400;
		gap: 1.5rem;
		padding: 0;
	}

	label {
		font-weight: 400;
	}

	legend {
		color: var(--color-gray-800);
		font-weight: 500;
		line-height: 1.5;
		margin-bottom: 0.75rem;
	}
</style>
