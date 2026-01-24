<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Relation from '~icons/knotdots/relation';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import type { Container, OrganizationalUnitPayload, OrganizationPayload } from '$lib/models';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: Container<OrganizationPayload> | Container<OrganizationalUnitPayload>;
		linkPath: string;
		selectedContext: Container<OrganizationPayload> | Container<OrganizationalUnitPayload> | null;
	}

	let { container, linkPath, selectedContext = $bindable() }: Props = $props();
</script>

<OrganizationCard {container} {linkPath} showRelationFilter>
	{#snippet button()}
		<button
			class="button-relation button-relation--square"
			type="button"
			class:is-active={container.guid === selectedContext?.guid}
			onclick={(event: Event) => {
				event.stopPropagation();
				selectedContext = container.guid === selectedContext?.guid ? null : container;
			}}
			{@attach tooltip($_('show_related_objects'))}
		>
			<Relation />
		</button>
	{/snippet}
</OrganizationCard>
