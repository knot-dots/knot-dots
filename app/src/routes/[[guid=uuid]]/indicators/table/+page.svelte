<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Help from '$lib/components/Help.svelte';
  import Table from '$lib/components/Table.svelte';
  import type { PageProps } from './$types';
  import Header from '$lib/components/Header.svelte';
  import Layout from '$lib/components/Layout.svelte';
  import { audience, computeFacetCount, indicatorCategories, indicatorTypes, policyFieldBNK, sustainableDevelopmentGoals, topics, isActualDataContainer } from '$lib/models';

  let { data }: PageProps = $props();

  console.log('Indicators Table Data:', data);

  // Only show actual data containers
  let filtered = $derived(data.containers.filter(isActualDataContainer));

  let facets = $derived.by(() => {
    const facets = new Map([
      ['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
      ['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
      ['audience', new Map(audience.options.map((v) => [v as string, 0]))],
      ['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
      ['topic', new Map(topics.options.map((v) => [v as string, 0]))],
      ['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
    ]);

    return computeFacetCount(facets, filtered);
  });
</script>

<Layout>
  {#snippet header()}
    <Header {facets} search />
  {/snippet}

  {#snippet main()}
    <Table
      columns={[
        { heading: $_('title'), key: 'title' },
        { heading: $_('description'), key: 'description' },
        { heading: $_('visibility.label'), key: 'visibility' },
        { heading: $_('label.unit'), key: 'unit' },
        { heading: $_('indicator_category'), key: 'indicatorCategory' },
        { heading: $_('indicator_type'), key: 'indicatorType' },
        { heading: $_('category'), key: 'category' },
        { heading: $_('topic'), key: 'topic' },
        { heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
        { heading: $_('audience'), key: 'audience' },
        { heading: $_('editorial_state'), key: 'editorialState' },
        { heading: $_('organizational_unit'), key: 'organizationalUnit' }
      ]}
      rows={filtered}
    />
    <Help slug="indicators-table" />
  {/snippet}
</Layout>
