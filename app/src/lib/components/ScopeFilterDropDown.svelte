<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import type { OrganizationContainer, OrganizationalUnitContainer } from '$lib/models';

	const currentOrganization = $derived(page.data.currentOrganization as OrganizationContainer);
	const currentOrganizationalUnit = $derived(
		page.data.currentOrganizationalUnit as OrganizationalUnitContainer | undefined
	);
	const subscribedOrganizations = $derived(
		(page.data.subscribedOrganizations ?? []) as OrganizationContainer[]
	);

	const options = $derived.by(() => {
		const opts: Array<{ label: string; value: string }> = [];

		if (currentOrganizationalUnit) {
			opts.push({
				label: currentOrganizationalUnit.payload.name,
				value: currentOrganizationalUnit.guid
			});
		}

		opts.push({
			label: currentOrganization.payload.name,
			value: currentOrganization.guid
		});

		for (const org of subscribedOrganizations) {
			opts.push({
				label: org.payload.name,
				value: org.guid
			});
		}

		if (!currentOrganization.payload.default) {
			opts.push({
				label: $_('scope.platform'),
				value: 'platform'
			});
		}

		return opts;
	});
</script>

{#if options.length > 1}
	<FilterDropDown key="scope" {options} />
{/if}
