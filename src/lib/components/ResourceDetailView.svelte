<script lang="ts">
	import { _, date, number } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import {
		type AnyContainer,
		type Container,
		isMeasureContainer,
		overlayKey,
		overlayURL,
		type ResourceContainer
	} from '$lib/models';

	export let container: ResourceContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers.find(isMeasureContainer);
</script>

<ContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<div class="amount">
			<h3>{$_('amount')}</h3>
			<p>{$number(container.payload.amount)} {container.payload.unit}</p>
		</div>
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('fulfillment_date')}</h3>
			<p class="meta-value">
				{$date(new Date(container.payload.fulfillmentDate), { format: 'medium' })}
			</p>
		</div>

		{#if measure}
			<div class="meta">
				<h3 class="meta-key">{$_('measure')}</h3>
				<p class="meta-value">
					<a href={overlayURL($page.url, overlayKey.enum.view, measure.guid)}>
						{$_(measure.payload.title)}
					</a>
				</p>
			</div>
		{/if}
	</svelte:fragment>
</ContainerDetailView>
