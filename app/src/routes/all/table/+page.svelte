<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import type { PageProps } from './$types';
	import Table from '$lib/components/Table.svelte';
	import {
		isGoalContainer,
		isMeasureContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		isProgramContainer
	} from '$lib/models';

	let { data }: PageProps = $props();
</script>

<AllPage {data}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('object'), key: 'type' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('status'), key: 'status' },
			{ heading: $_('category'), key: 'category' },
			{ heading: $_('topic'), key: 'topic' },
			{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
			{ heading: $_('audience'), key: 'audience' },
			{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
			{ heading: $_('planned_duration'), key: 'duration' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={data.containers
			.filter(
				(c) =>
					isGoalContainer(c) ||
					isMeasureContainer(c) ||
					isRuleContainer(c) ||
					isSimpleMeasureContainer(c) ||
					isProgramContainer(c)
			)
			.slice(0, browser ? undefined : 20)}
	/>
	<Help slug="all-table" />
</AllPage>
