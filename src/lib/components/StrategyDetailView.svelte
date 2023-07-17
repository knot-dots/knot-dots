<script lang="ts">
	import { ChevronLeft, Icon, Pencil, PlusSmall } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import Chapter from '$lib/components/Chapter.svelte';
	import ModelChapter from '$lib/components/ModelChapter.svelte';
	import { isModelContainer, predicates, sdgIcons } from '$lib/models';
	import type { Container, ModelContainer, StrategyContainer } from '$lib/models';
	import { user } from '$lib/stores';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: Container[];

	$: parts = container.relation
		.filter(
			({ object, predicate, subject }) =>
				predicate == predicates.enum['is-part-of'] &&
				relatedContainers.find((r) => r.revision == subject) &&
				'revision' in container &&
				object == container.revision
		)
		.map(({ subject }) => relatedContainers.find((r) => r.revision == subject) as ModelContainer);
</script>

<div class="strategy">
	<article class="details">
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
					<h3 class="meta-key">{$_('object')}</h3>
					<p class="meta-value">{$_(container.payload.type)}</p>
				</div>
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
				<div class="meta">
					<h3 class="meta-key">{$_('created_date')}</h3>
					<ul class="meta-value">
						<li>{$date(revisions[0].valid_from, { format: 'medium' })}</li>
					</ul>
				</div>
				<div class="meta">
					<h3 class="meta-key">{$_('modified_date')}</h3>
					<ul class="meta-value">
						<li>{$date(container.valid_from, { format: 'medium' })}</li>
					</ul>
				</div>
			</div>
		</div>

		<footer>
			{#if $user.isAuthenticated}
				<a class="button primary" href="?new=text&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('text')}
				</a>
				<a class="button primary" href="?new=model&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('model')}
				</a>
			{/if}
		</footer>

		<div class="chapters">
			{#each parts as p, i}
				{#if isModelContainer(p)}
					<ModelChapter
						chapter={String(i + 1)}
						container={p}
						isPartOf={container}
						{relatedContainers}
					/>
				{:else}
					<Chapter chapter={String(i + 1)} container={p} isPartOf={container} />
				{/if}
			{/each}
		</div>
	</article>
</div>

<style>
	.strategy {
		flex: 1 1;
		overflow-x: auto;
	}

	article {
		border-radius: 8px;
		height: calc(100% - 2rem);
		margin: 1rem;
		min-width: calc(100vw - 20rem);
	}

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
