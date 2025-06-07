<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Help from '$lib/components/Help.svelte';
	import KnowledgePage from '$lib/components/KnowledgePage.svelte';
	import Table from '$lib/components/Table.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<KnowledgePage {data}>
	<Table
		columns={[
			{ heading: $_('title'), key: 'title' },
			{ heading: $_('description'), key: 'description' },
			{ heading: $_('visibility.label'), key: 'visibility' },
			{ heading: $_('category'), key: 'category' },
			{ heading: $_('topic'), key: 'topic' },
			{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
			{ heading: $_('audience'), key: 'audience' },
			{ heading: $_('organizational_unit'), key: 'organizationalUnit' }
		]}
		rows={data.containers}
	/>
	<Help slug="knowledge-table" />
</KnowledgePage>
