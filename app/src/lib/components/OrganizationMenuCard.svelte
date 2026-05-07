<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Relation from '~icons/knotdots/relation';
	import { page } from '$app/state';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import tooltip from '$lib/attachments/tooltip';
	import { getVisibleWorkspaces } from '$lib/workspaces';

	interface Props {
		container: OrganizationContainer | OrganizationalUnitContainer;
		linkPath: string;
		selectedContext: OrganizationContainer | OrganizationalUnitContainer | null;
	}

	let { container, linkPath: originalLinkPath, selectedContext = $bindable() }: Props = $props();

	const linkPath = $derived.by(() => {
		const organization = isOrganizationContainer(container)
			? container
			: page.data.organizations.find(({ guid }) => guid === container.organization);
		const workspaces = organization
			? getVisibleWorkspaces({
					organization,
					organizationalUnit: isOrganizationalUnitContainer(container) ? container : null,
					features: createFeatureDecisions(page.data.features)
				}).flatMap((w) => Object.values(w.views))
			: [];

		if (workspaces.some((w) => w.endsWith(originalLinkPath))) {
			return originalLinkPath;
		} else {
			return '/all/page';
		}
	});
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
