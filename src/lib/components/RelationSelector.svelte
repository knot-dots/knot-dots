<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { payloadTypes, predicates } from '$lib/models';
	import type { Container, PartialRelation, PayloadType } from '$lib/models';

	export let payloadType: PayloadType;
	export let isPartOfOptions: Container[];
	export let selected: PartialRelation[];
</script>

{#if payloadType !== payloadTypes.enum.strategy}
	<fieldset>
		<legend>
			{#if payloadType === payloadTypes.enum.model}
				{$_('superordinate_strategies')}
			{:else if payloadType === payloadTypes.enum.strategic_goal}
				{$_('superordinate_models')}
			{:else if payloadType === payloadTypes.enum.operational_goal}
				{$_('superordinate_strategic_goals')}
			{:else if payloadType === payloadTypes.enum.measure}
				{$_('superordinate_operational_goals')}
			{:else if payloadType === payloadTypes.enum.text}
				{$_('superordinate_chapters')}
			{/if}
		</legend>
		{#each isPartOfOptions as option}
			<label>
				<input
					type="checkbox"
					name="is-part-of"
					value={option.revision}
					checked={selected.findIndex(
						(r) => r.predicate === predicates.enum['is-part-of'] && r.object === option.revision
					) > -1}
				/>
				{option.payload.title}
			</label>
		{/each}
	</fieldset>
{/if}
