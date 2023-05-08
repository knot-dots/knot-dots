<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { containerTypes, predicates } from '$lib/models';
	import type { ContainerType } from '$lib/models';
	import type { Container, Relation } from '$lib/server/db';

	export let containerType: ContainerType;
	export let isPartOfOptions: Container[];
	export let selected: Relation[];
</script>

{#if containerType !== containerTypes.enum.strategy}
	<fieldset>
		<legend>
			{#if containerType === containerTypes.enum.model}
				{$_('superordinate_strategies')}
			{:else if containerType === containerTypes.enum.strategic_goal}
				{$_('superordinate_models')}
			{:else if containerType === containerTypes.enum.operational_goal}
				{$_('superordinate_strategic_goals')}
			{:else if containerType === containerTypes.enum.measure}
				{$_('superordinate_operational_goals')}
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
