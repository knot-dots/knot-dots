<script lang="ts">
	import { _ } from 'svelte-i18n';
	import saveContainer from '$lib/client/saveContainer';
	import {
		type Container,
		type IndicatorContainer,
		newIndicatorTemplateFromIndicator,
		payloadTypes,
		quantities
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: IndicatorContainer;
		relatedContainers: Container[];
	}

	let { container, relatedContainers }: Props = $props();

	let saveAsIndicatorTemplateDisabled = $state(false);

	function saveIndicatorAsTemplate(c: IndicatorContainer) {
		return async () => {
			saveAsIndicatorTemplateDisabled = true;
			await saveContainer(newIndicatorTemplateFromIndicator(c));
		};
	}
</script>

{#if container.payload.quantity === quantities.enum['quantity.custom'] && $ability.can('create', payloadTypes.enum.indicator_template)}
	<button
		type="button"
		onclick={saveIndicatorAsTemplate(container)}
		disabled={saveAsIndicatorTemplateDisabled}
		aria-label={$_('indicator.save_as_template')}
		{@attach tooltip($_('indicator.save_as_template'))}
	>
		{$_('indicator.save_as_template')}
	</button>
{/if}
