<script lang="ts">
	import { ChevronLeft, Icon, Pencil, PlusSmall } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Chapter from '$lib/components/Chapter.svelte';
	import ModelChapter from '$lib/components/ModelChapter.svelte';
	import { isModelContainer, owners, predicates } from '$lib/models';
	import type { AnyContainer, Container, ModelContainer, StrategyContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import { sdgIcons } from '$lib/theme/models';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: AnyContainer[];

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
			<h2>
				{container.payload.title}
				<span class="icons">
					{#if $ability.can('update', container)}
						<a href="?edit={container.guid}" class="icons-element">
							<Icon solid src={Pencil} size="20" />
						</a>
					{/if}
					<button class="icons-element" type="button" on:click={() => window.history.back()}>
						<Icon solid src={ChevronLeft} size="20" />
					</button>
				</span>
			</h2>
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
					<h3 class="meta-key">{$_('owned_by')}</h3>
					<ul class="meta-value">
						{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
							<li>{owner.payload.name}</li>
						{/each}
					</ul>
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
			{#if $ability.can('update', container)}
				<a class="button primary" href="?overlay-new=text&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('text')}
				</a>
				<a class="button primary" href="?overlay-new=model&is-part-of={container.revision}">
					<Icon src={PlusSmall} size="24" mini />
					{$_('model')}
				</a>
			{/if}
		</footer>

		<div class="chapters">
			{#each parts as p}
				{#if isModelContainer(p)}
					<ModelChapter container={p} headingTag="h3" isPartOf={container} {relatedContainers} />
				{:else}
					<Chapter container={p} headingTag="h3" isPartOf={container} />
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

	.details header h2 {
		font-size: 2.125rem;
		font-weight: 800;
	}

	.details-content::before {
		content: none;
	}

	.chapters {
		border-top: solid 1px var(--color-gray-300);
	}
</style>
