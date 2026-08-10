<script lang="ts">
	import { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		type AnyPayload,
		type Container,
		getManagedByAll,
		isMeasureContainer,
		isProgramContainer
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, relatedContainers }: Props = $props();

	let candidates = $derived([
		container,
		...page.data.organizations,
		...page.data.organizationalUnits,
		...relatedContainers
	]);

	// A freshly assigned team (e.g. a program added moments ago) may not be among
	// the candidates loaded with the page yet; fetch the stragglers on demand.
	let unresolved = $derived(
		container.managed_by.filter((guid) => !candidates.some((candidate) => candidate.guid === guid))
	);

	let unresolvedQuery = resource([() => unresolved], async ([unresolved], _prev, { signal }) =>
		unresolved.length > 0 ? fetchContainers({ guid: unresolved }, 'alpha', { signal }) : []
	);

	// The managed_by containers are the teams themselves, nearest first — with the
	// accumulated value e.g. the measure's own team followed by its programs' teams.
	// Programs and measures are shown prefixed as "Team <title>"; organizations and
	// organizational units by their plain name.
	let teamNames = $derived(
		getManagedByAll(container, [...candidates, ...(unresolvedQuery.current ?? [])])
			.map((managedBy) => {
				if (isProgramContainer(managedBy) || isMeasureContainer(managedBy)) {
					return $_('visibility.team', { values: { title: managedBy.payload.title } });
				}
				return 'name' in managedBy.payload ? managedBy.payload.name : '';
			})
			.filter((name) => name !== '')
	);
</script>

<div class="label">{$_('managed_by')}</div>
<div class="value value--read-only">
	{#each teamNames as teamName (teamName)}
		<span class="badge badge--gray">{teamName}</span>
	{:else}
		&nbsp;
	{/each}
</div>

<style>
	.value {
		flex-wrap: wrap;
		gap: 0.25rem;
		padding-left: var(--dropdown-button-padding-y);
	}
</style>
