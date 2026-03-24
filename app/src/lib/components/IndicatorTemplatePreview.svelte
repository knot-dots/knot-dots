<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Badges from '$lib/components/Badges.svelte';
	import IndicatorProperties from '$lib/components/IndicatorProperties.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import NewIndicatorChart from '$lib/components/NewIndicatorChart.svelte';
	import { type IndicatorTemplateContainer } from '$lib/models';
	import { fetchContainersRelatedToIndicatorTemplates } from '$lib/remote/data.remote';
	import { page } from '$app/state';

	interface Props {
		container: IndicatorTemplateContainer;
	}

	let { container }: Props = $props();

	let guid = $derived(container.guid);

	let relatedContainersQuery = $derived(
		fetchContainersRelatedToIndicatorTemplates({
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
			<h1 class="details-title">{container.payload.title}</h1>
		</div>

		<div class="details-meta">
			<Badges {container} />
		</div>
	</header>

	<IndicatorProperties {container} {relatedContainers} revisions={[]} />

	<EditableFormattedText label={$_('description')} value={container.payload.description} />

	<div class="details-section">
		<NewIndicatorChart {container} {relatedContainers} />
	</div>
</article>

<style>
	.details {
		overflow-y: auto;
		padding-bottom: 0;
		padding-top: 0;
	}
</style>
