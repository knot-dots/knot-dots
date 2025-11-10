<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import Table from '$lib/components/Table.svelte';
	import type { PageProps } from './$types';
	import IndicatorsPage from '$lib/components/IndicatorsPage.svelte';

	let { data }: PageProps = $props();
</script>

<IndicatorsPage {data}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('label.unit'), key: 'unit' },
			{ heading: $_('indicator_category'), key: 'indicatorCategory' },
			{ heading: $_('indicator_type'), key: 'indicatorType' },
			{ heading: $_('topic'), key: 'topic' },
			{ heading: $_('category'), key: 'category' },
			{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
			{ heading: $_('audience'), key: 'audience' },
			{ heading: $_('editorial_state'), key: 'editorialState' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={data.containers}
	/>
	<Help slug="indicators-table" />
</IndicatorsPage>
