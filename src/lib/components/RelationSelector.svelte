<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { payloadTypes, predicates } from '$lib/models';
	import type { Container, EmptyContainer } from '$lib/models';

	export let container: Container | EmptyContainer;
	export let isPartOfOptions: Container[];
</script>

{#if container.payload.type !== payloadTypes.enum.strategy && !('guid' in container)}
	<fieldset>
		<legend>
			{#if container.payload.type === payloadTypes.enum.model}
				{$_('superordinate_strategies')}
			{:else if container.payload.type === payloadTypes.enum.strategic_goal}
				{$_('superordinate_models')}
			{:else if container.payload.type === payloadTypes.enum.operational_goal}
				{$_('superordinate_strategic_goals')}
			{:else if container.payload.type === payloadTypes.enum.measure}
				{$_('superordinate_operational_goals')}
			{:else if container.payload.type === payloadTypes.enum.text}
				{$_('superordinate_chapters')}
			{/if}
		</legend>
		{#each isPartOfOptions as option}
			<label>
				<input
					type="radio"
					name="is-part-of"
					value={option.revision}
					checked={container.relation.findIndex(
						(r) => r.predicate === predicates.enum['is-part-of'] && r.object === option.revision
					) > -1}
				/>
				{option.payload.title}
			</label>
		{/each}
	</fieldset>
{/if}
