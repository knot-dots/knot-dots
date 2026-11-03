<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import withOptimistic from '$lib/client/withOptimistic';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import Header from '$lib/components/Header.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type Container,
		type GoalPayload,
		isIndicatorContainer,
		type MeasurePayload,
		predicates
	} from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';

	interface Props {
		container: Container<GoalPayload | MeasurePayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	// The overlay is not reloaded after changes, so they are applied here like on
	// the board page; of the containers created elsewhere only the parts of this
	// container are shown, along with indicators their cards may refer to.
	let optimisticContainers = $derived(
		withOptimistic(
			containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers,
			(created) =>
				isIndicatorContainer(created) ||
				created.relation.some(
					({ object, predicate }) =>
						object === container.guid && predicate === predicates.enum['is-part-of']
				)
		)
	);

	setBulkActionContext({
		actions: ['status', 'visibility', 'delete'],
		selected: new SvelteSet<string>()
	});
</script>

<Header review />

<div class="content">
	<IOOI {container} containers={optimisticContainers}></IOOI>

	<ContextTabs slug="iooi" />
</div>
