<script lang="ts">
	import { getContext, hasContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Relation from '~icons/knotdots/relation';
	import type { AnyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: AnyContainer;
	}

	let { container }: Props = $props();

	let mayShowRelationButton =
		hasContext('relationOverlay') &&
		(getContext('relationOverlay') as { enabled: boolean }).enabled;
</script>

{#if mayShowRelationButton && $ability.can('relate', container)}
	<a class="button button-relation" href="#relations={container.guid}">
		<Relation />
		{$_('relations')}
	</a>
{/if}
