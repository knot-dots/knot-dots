<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray-20-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import Chapter from '$lib/components/Chapter.svelte';
	import ContainerDetailView from '$lib/components/ContainerDetailView.svelte';
	import { containerOfType, paramsFromFragment, payloadTypes, predicates } from '$lib/models';
	import type { AnyContainer, Container, PayloadType, StrategyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: StrategyContainer;
	export let relatedContainers: Container[] = [];
	export let revisions: AnyContainer[];

	function addChapterURL(url: URL, strategyRevision: number) {
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', String(strategyRevision));
		for (const payloadType of container.payload.chapterType) {
			params.append('payloadType', payloadType);
		}
		return `#${params.toString()}`;
	}

	function byPayloadType(payloadType: PayloadType, url: URL) {
		const params = paramsFromFragment(url);
		return !params.has('payloadType') || params.getAll('payloadType').includes(payloadType);
	}
</script>

<ContainerDetailView {container} {relatedContainers} {revisions} tabs={[]}>
	<svelte:fragment slot="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('level.label')}</h3>
			<p class="meta-value">{$_(container.payload.level)}</p>
		</div>

		<div class="meta">
			<h3 class="meta-key">{$_('strategy_type.label')}</h3>
			<p class="meta-value">{$_(container.payload.strategyType)}</p>
		</div>

		{#if container.payload.pdf.length > 0}
			<div class="meta">
				<h3 class="meta-key">{$_('pdf')}</h3>
				<ul class="meta-value">
					{#each container.payload.pdf as pdf}
						<li>
							<a href={pdf[0]}>
								{pdf[1]}
								<ArrowDownTray />
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<div class="chapters">
			{#each relatedContainers
				.filter( ({ guid, relation }) => relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-strategy'] && guid != container.guid) )
				.filter(({ payload }) => byPayloadType(payload.type, $page.url)) as part}
				<Chapter container={part} headingTag="h3" isPartOf={container} {relatedContainers} />
			{:else}
				{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, $page.data.currentOrganization.guid, $page.data.currentOrganizationalUnit?.guid ?? null, container.managed_by, env.PUBLIC_KC_REALM))}
					<a class="button" href={addChapterURL($page.url, container.revision)}>
						<PlusSmall />
						{$_('chapter')}
					</a>
				{/if}
			{/each}
		</div>
	</svelte:fragment>
</ContainerDetailView>

<style>
	.chapters {
		border-top: solid 1px var(--color-gray-300);
		padding-top: 1.5rem;
	}
</style>
