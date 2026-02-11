<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import ResourcesPage from '$lib/components/ResourcesPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ResourcesPage {data} showSaveWorkspace savePayloadType={[payloadTypes.enum.resource_v2]}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			// { heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('resource_category'), key: 'resourceCategory' },
			{ heading: $_('label.unit'), key: 'resourceUnit' }
			// { heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={data.containers}
	/>
	<Help slug="resources-table" />
</ResourcesPage>
