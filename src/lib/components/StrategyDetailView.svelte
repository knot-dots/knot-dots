<script lang="ts">
	import { ArrowDownTray, Icon, PlusSmall } from 'svelte-hero-icons';
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Chapter from '$lib/components/Chapter.svelte';
	import { owners } from '$lib/models';
	import type { AnyContainer, Container, StrategyContainer } from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: AnyContainer[];
</script>

<article class="details">
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
	{#if container.payload.pdf}
		<div class="meta">
			<h3 class="meta-key">{$_('pdf')}</h3>
			<p class="meta-value meta-value-pdf">
				<a href={container.payload.pdf}>
					{$_('download')}
					<Icon src={ArrowDownTray} size="20" mini />
				</a>
			</p>
		</div>
	{/if}
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

	<div class="chapters">
		{#each relatedContainers as part}
			<Chapter container={part} headingTag="h3" isPartOf={container} />
		{:else}
			<a class="button" href="#create=undefined&is-part-of-strategy={container.revision}">
				<Icon src={PlusSmall} size="24" mini />
				{$_('chapter')}
			</a>
		{/each}
	</div>
</article>

<style>
	.chapters {
		border-top: solid 1px var(--color-gray-300);
		padding-top: 1.5rem;
	}
</style>
