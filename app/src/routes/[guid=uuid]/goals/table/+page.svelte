<script lang="ts">
	import { _ } from 'svelte-i18n';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import Table from '$lib/components/Table.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GoalsPage {data} showSaveWorkspace savePayloadType={[payloadTypes.enum.goal]}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('goal_status'), key: 'status' },
			{ heading: $_('category'), key: 'category' },
			{ heading: $_('topic'), key: 'topic' },
			{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
			{ heading: $_('audience'), key: 'audience' },
			{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
			{ heading: $_('editorial_state'), key: 'editorialState' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
			{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
			{ heading: $_('goal_type'), key: 'objectType' }
		]}
		rows={data.containers}
	/>
	<Help slug="goals-table" />
</GoalsPage>
