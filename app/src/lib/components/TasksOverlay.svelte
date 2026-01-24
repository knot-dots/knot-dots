<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Tasks from '$lib/components/Tasks.svelte';
	import {
		type AnyPayload,
		computeFacetCount,
		type Container,
		isContainerWithPayloadType,
		isPartOf,
		payloadTypes,
		taskCategories
	} from '$lib/models';

	interface Props {
		container: Container<AnyPayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	let facets = $derived(
		computeFacetCount(
			new Map([
				['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
				['assignee', new Map()]
			]),
			containers
		)
	);
</script>

<Header {facets} search />

<Tasks
	{container}
	containers={containers.filter((container) =>
		isContainerWithPayloadType(payloadTypes.enum.task, container)
	)}
	relatedContainers={containers
		.filter((container) => isContainerWithPayloadType(payloadTypes.enum.goal, container))
		.filter((c) =>
			containers
				.filter((container) => isContainerWithPayloadType(payloadTypes.enum.task, container))
				.some(isPartOf(c))
		)}
/>

<Help slug="tasks-status" />
