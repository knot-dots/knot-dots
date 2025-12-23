<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { date } from 'svelte-i18n';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		type AnyContainer,
		type KnowledgeContainer,
		isContentPartnerContainer,
		payloadTypes
	} from '$lib/models';

	interface Props {
		container: KnowledgeContainer;
	}

	let { container }: Props = $props();

	let contentPartners: AnyContainer[] = $state([]);
	let partnerName = $derived(
		(contentPartners.find((c) => c.guid === container.payload.content_partner) as AnyContainer)
			?.payload?.title
	);

	$effect(() => {
		if (container.payload.content_partner) {
			fetchContainers({ payloadType: [payloadTypes.enum.content_partner] }).then((containers) => {
				contentPartners = containers;
			});
		}
	});
</script>

<div class="knowledge-content">
	<div class="meta-top">
		{#if container.payload.category}
			<span class="category-badge">{$_(`knowledge.category.${container.payload.category}`)}</span>
		{/if}

		{#if partnerName}
			<span class="value">{partnerName}</span>
		{/if}
		{#if container.payload.date}
			<span class="date">{$date(new Date(container.payload.date), { format: 'medium' })}</span>
		{/if}
	</div>

	<h3 class="title">
		{container.payload.title || $_('untitled')}
	</h3>

	{#if container.payload.tags.length > 0}
		<div class="tags">
			{#each container.payload.tags as tag}
				<span class="tag">
					{$_(`knowledge.tags.${tag}`) !== `knowledge.tags.${tag}`
						? $_(`knowledge.tags.${tag}`)
						: tag}
				</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.knowledge-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.meta-top {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		align-items: center;
		font-size: 0.75rem;
		color: var(--color-gray-500);
	}

	.category-badge {
		background-color: var(--color-primary-050);
		color: var(--color-primary-700);
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-weight: 500;
		text-transform: uppercase;
		font-size: 0.625rem;
		letter-spacing: 0.05em;
	}

	.title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-gray-900);
		margin: 0;
		line-height: 1.4;
	}

	.partner {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
		align-items: center;
	}

	.partner .label {
		color: var(--color-gray-500);
	}

	.partner .value {
		font-weight: 500;
		color: var(--color-gray-700);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: auto;
	}

	.tag {
		background-color: var(--color-gray-100);
		color: var(--color-gray-600);
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}
</style>
