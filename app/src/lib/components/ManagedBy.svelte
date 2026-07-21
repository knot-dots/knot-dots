<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import {
		type AnyPayload,
		type Container,
		getManagedBy,
		isMeasureContainer,
		isProgramContainer
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, relatedContainers }: Props = $props();

	let managedBy = $derived(
		getManagedBy(container, [
			...page.data.organizations,
			...page.data.organizationalUnits,
			...relatedContainers
		])
	);

	// The managed_by container is the team itself. Programs and measures are shown
	// prefixed as "Team <title>"; organizations and organizational units by their
	// plain name.
	let teamName = $derived.by(() => {
		if (!managedBy) {
			return '';
		}
		if (isProgramContainer(managedBy) || isMeasureContainer(managedBy)) {
			return $_('visibility.team', { values: { title: managedBy.payload.title } });
		}
		return 'name' in managedBy.payload ? managedBy.payload.name : '';
	});
</script>

<div class="label">{$_('managed_by')}</div>
<div class="value value--read-only">
	{#if teamName}{teamName}{:else}&nbsp;{/if}
</div>
