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
