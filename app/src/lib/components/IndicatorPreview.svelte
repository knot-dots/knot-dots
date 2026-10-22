<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Badges from '$lib/components/Badges.svelte';
	import BinaryIndicatorProperties from '$lib/components/BinaryIndicatorProperties.svelte';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableLogo from '$lib/components/EditableLogo.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import PropertiesBar from '$lib/components/PropertiesBar.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type BinaryIndicatorPayload,
		type Container,
		type IndicatorPayload,
		isActualDataContainer,
		isBinaryIndicatorContainer
	} from '$lib/models';
	import { fetchContainersRelatedToIndicators } from '$lib/remote/data.remote';

	interface Props {
		container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
	}

	let { container }: Props = $props();

	let guid = $derived(container.guid);

	let relatedContainersQuery = $derived(
		fetchContainersRelatedToIndicators({
			guid,
			params: {
				organization: page.data.currentOrganization.guid,
				...(page.data.currentOrganizationalUnit
					? { organizationalUnit: page.data.currentOrganizationalUnit.guid }
					: undefined)
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);
</script>

<article class="details">
	<header class="details-section">
		<div class="details-header">
			<EditableLogo value={container.payload.icon} />
			<h1 class="details-title">{container.payload.title}</h1>
		</div>

		<div class="details-meta">
			{#if createFeatureDecisions(page.data.features).useNewPropertyPanel()}
				<PropertiesBar {container} revisions={[]} />
			{:else}
				<Badges {container} />
			{/if}
		</div>
	</header>

	{#if !createFeatureDecisions(page.data.features).useNewPropertyPanel()}
		{#if isBinaryIndicatorContainer(container)}
			<BinaryIndicatorProperties {container} {relatedContainers} revisions={[]} />
		{:else}
			<IndicatorProperties {container} {relatedContainers} revisions={[]} />
		{/if}
	{/if}

	<EditableFormattedText label={$_('description')} value={container.payload.description} />

	<div class="details-section">
		{#if isBinaryIndicatorContainer(container)}
			<BooleanValueToggle
				checked={relatedContainers.filter(isActualDataContainer).at(0)?.payload.booleanValue ??
					false}
				disabled
			/>
		{:else}
			<NewIndicatorChart {container} {relatedContainers} />
		{/if}
	</div>
</article>

<style>
	.details {
		overflow-y: auto;
		padding-bottom: 0;
		padding-top: 0;
	}

	.details-header {
		align-items: center;
		display: flex;
		gap: 0.75rem;
	}

	.details-header :global(.logo) {
		--logo-height: 2.5rem;
		flex-shrink: 0;
	}
</style>
