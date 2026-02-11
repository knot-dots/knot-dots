<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MeasuresPage
	{data}
	showSaveWorkspace
	savePayloadType={[payloadTypes.enum.measure, payloadTypes.enum.simple_measure]}
>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('status'), key: 'status' },
			{ heading: $_('category'), key: 'category' },
			{ heading: $_('topic'), key: 'topic' },
			{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
			{ heading: $_('audience'), key: 'audience' },
			{ heading: $_('planned_duration'), key: 'duration' },
			{ heading: $_('editorial_state'), key: 'editorialState' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
			{ heading: $_('measure_type'), key: 'objectType' }
		]}
		rows={data.containers}
	/>
	<Help slug="measures-table" />
</MeasuresPage>
