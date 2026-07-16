<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { type AnyPayload, type Container, getManagedBy, isProgramContainer } from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let { container, relatedContainers }: Props = $props();

	let organization = $derived(
		page.data.organizations.find(({ guid }) => guid === container.organization)
	);

	let organizationalUnit = $derived(
		page.data.organizationalUnits.find(({ guid }) => guid === container.organizational_unit)
	);

	let teams = $derived(
		getManagedBy(container, [
			...page.data.organizations,
			...page.data.organizationalUnits,
			...relatedContainers
		]).toSorted((a, b) => Number(isProgramContainer(b)) - Number(isProgramContainer(a)))
	);

	function containerName(c: Container<AnyPayload>) {
		if ('name' in c.payload) {
			return c.payload.name;
		} else if ('title' in c.payload) {
			return c.payload.title;
		}
		return '';
	}

	let segments = $derived([
		...(organization ? [containerName(organization)] : []),
		...(organizationalUnit ? [containerName(organizationalUnit)] : []),
		...teams.map((team) => $_('managed_by_team_prefix', { values: { name: containerName(team) } }))
	]);
</script>

<div class="label">{$_('managed_by')}</div>
<div class="value value--read-only">
	{#if segments.length > 0}{segments.join(' / ')}{:else}&nbsp;{/if}
</div>
