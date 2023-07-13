<script lang="ts">
	import type { Container, StrategyContainer } from '$lib/models';
	import { _ } from 'svelte-i18n';
	import { isModelContainer, isPartOf, sdgIcons } from '$lib/models';
	import ModelChapter from '$lib/components/ModelChapter.svelte';
	import { user } from '$lib/stores';
	import { ChevronLeft, Icon, Pencil } from 'svelte-hero-icons';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];

	$: parts = relatedContainers.filter(isModelContainer).filter(isPartOf(container));
</script>

<article class="details details--page">
	<header>
		<h2>{container.payload.title}</h2>
		<div class="icons">
			{#if $user.isAuthenticated}
				<a href="?edit={container.guid}" class="icons-element">
					<Icon solid src={Pencil} size="20" />
				</a>
			{/if}
			<button class="icons-element" type="button" on:click={() => window.history.back()}>
				<Icon solid src={ChevronLeft} size="20" />
			</button>
		</div>
	</header>
	<div class="details-content">
		<div class="details-content-column">
			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(container.payload.strategyType)}</p>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('topic.label')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each container.payload.topic as topic}
						<li>{$_(topic)}</li>
					{/each}
				</ul>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('category')}</h3>
				<ul class="meta-value meta-value--category">
					{#each container.payload.category as category}
						<li>
							<img
								src={sdgIcons.get(category)}
								alt={$_(category)}
								title={$_(category)}
								width="66"
								height="66"
							/>
						</li>
					{/each}
				</ul>
			</div>
		</div>
		<div class="details-content-column">
			<div class="meta">
				<h3 class="meta-key">{$_('level.label')}</h3>
				<p class="meta-value">{$_(container.payload.level)}</p>
			</div>
		</div>
	</div>
	<div class="chapters">
		{#each parts as p}
			<ModelChapter container={p} {relatedContainers} />
		{/each}
	</div>
</article>

<style>
	.details-content::before {
		content: none;
	}

	.chapters {
		border-top: solid 1px var(--color-gray-300);
	}

	.chapters > :global(*) {
		border-bottom: solid 1px var(--color-gray-300);
	}

	.chapters > :global(*:last-child) {
		border-bottom: none;
	}
</style>
