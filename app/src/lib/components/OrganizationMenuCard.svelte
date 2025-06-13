<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Relation from '~icons/knotdots/relation';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';

	interface Props {
		container: OrganizationContainer | OrganizationalUnitContainer;
		linkPath: string;
		selectedContext: OrganizationContainer | OrganizationalUnitContainer | null;
	}

	let { container, linkPath, selectedContext = $bindable() }: Props = $props();
</script>

<OrganizationCard {container} {linkPath} showRelationFilter>
	{#snippet button()}
		<button
			class="button-relation button-relation--square"
			aria-label={$_('show_related_objects')}
			type="button"
			class:is-active={container.guid === selectedContext?.guid}
			onclick={(event: Event) => {
				event.stopPropagation();
				selectedContext = container.guid === selectedContext?.guid ? null : container;
			}}
		>
			<Relation />
		</button>
	{/snippet}
</OrganizationCard>
