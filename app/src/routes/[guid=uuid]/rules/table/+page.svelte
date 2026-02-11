<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import Table from '$lib/components/Table.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<RulesPage {data} showSaveWorkspace savePayloadType={[payloadTypes.enum.rule]}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('rule_status'), key: 'status' },
			{ heading: $_('category'), key: 'category' },
			{ heading: $_('topic'), key: 'topic' },
			{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
			{ heading: $_('audience'), key: 'audience' },
			{ heading: $_('editorial_state'), key: 'editorialState' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={data.containers}
	/>
	<Help slug="rules-table" />
</RulesPage>
