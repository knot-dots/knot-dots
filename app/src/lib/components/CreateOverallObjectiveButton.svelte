<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { goto } from '$app/navigation';
	import createObjective from '$lib/client/createObjective';
	import {
		type Container,
		findOverallObjective,
		type IndicatorContainer,
		payloadTypes
	} from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: IndicatorContainer;
		relatedContainers: Container[];
	}

	let { container, relatedContainers }: Props = $props();

	function createOverallObjective(c: IndicatorContainer) {
		return async () => {
			const objective = await createObjective(c, c);
			await goto(`#view=${objective.guid}`, { invalidateAll: true });
		};
	}
</script>

{#if !findOverallObjective(container, relatedContainers) && $ability.can('create', payloadTypes.enum.objective)}
	<button type="button" onclick={createOverallObjective(container)}>
		<Plus />{$_('overall_objective')}
	</button>
{/if}
