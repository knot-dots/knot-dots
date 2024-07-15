<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import ArrowDownTray from '~icons/heroicons/arrow-down-tray-20-solid';
	import Pencil from '~icons/heroicons/pencil-solid';
	import { page } from '$app/stores';
	import fetchMembers from '$lib/client/fetchMembers';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import ObjectiveCarousel from '$lib/components/ObjectiveCarousel.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import TaskCarousel from '$lib/components/TaskCarousel.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		type AnyContainer,
		type Container,
		getCreator,
		isContainer,
		isContainerWithObjective,
		isIndicatorContainer,
		isLevel,
		isMeasureContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		isStrategyContainer,
		overlayKey,
		owners,
		paramsFromFragment,
		payloadTypes,
		type User
	} from '$lib/models';
	import { sdgIcons } from '$lib/theme/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: AnyContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({ ...state, containerDetailView: { tabs: [] } }));

	$: strategy = isStrategyContainer(container)
		? container
		: relatedContainers.find(isStrategyContainer);

	$: measure = isMeasureContainer(container)
		? container
		: relatedContainers.find(isMeasureContainer);

	let isPage = $page.url.pathname == `/${container.payload.type}/${container.guid}`;

	function containerURL(type: string, guid: string) {
		if (isPage) {
			return `/${type}/${guid}`;
		} else {
			const query = paramsFromFragment($page.url);
			query.set(overlayKey.enum.view, guid);
			return `#${query.toString()}`;
		}
	}

	let organizationMembersRequest: Promise<User[]> = new Promise(() => []);

	$: organizationMembersRequest = fetchMembers(container.organization);
</script>

<article class="details">
	<h2 class="details-title">
		{#if container.payload.type === payloadTypes.enum.organization || container.payload.type === payloadTypes.enum.organizational_unit}
			{container.payload.name}
		{:else}
			{container.payload.title}
		{/if}
		{#if $ability.can('update', container)}
			<a class="button button-square quiet" href="#view={container.guid}&edit">
				<Pencil />
			</a>
		{/if}
	</h2>

	<slot name="data">
		{#if 'summary' in container.payload || 'description' in container.payload}
			<div class="summary">
				<h3>{$_('summary')}</h3>
				<Summary {container} />
			</div>
		{/if}

		{#if 'description' in container.payload}
			<div class="description">
				<h3>{$_('description')}</h3>
				<Viewer value={container.payload.description} />
			</div>
		{/if}

		{#if isContainerWithObjective(container)}
			<div class="indicator-objective">
				<h3>{$_('objectives')}</h3>
				<ObjectiveCarousel {container} />
			</div>
		{/if}

		{#if 'progress' in container.payload}
			<div class="progress">
				<h3>{$_('progress')}</h3>
				<Progress value={container.payload.progress} />
			</div>
		{/if}

		{#if isContainerWithObjective(container) || isMilestoneContainer(container) || isMeasureResultContainer(container)}
			<TaskCarousel {container} />
		{/if}

		{#if 'body' in container.payload}
			<div class="body">
				<h3>{$_('Body')}</h3>
				<Viewer value={container.payload.body} />
			</div>
		{/if}

		{#if 'image' in container.payload}
			<div class="image">
				<img alt={$_('cover_image')} src={container.payload.image} />
			</div>
		{/if}

		{#if 'indicator' in container.payload && container.payload.indicator.length > 0}
			<div class="indicator">
				<h3>{$_('indicator.legend')}</h3>
				<ProgressBar
					guid={container.guid}
					indicator={container.payload.indicator[0]}
					contributors={relatedContainers.filter(isMeasureContainer)}
				/>
			</div>
		{/if}

		{#if isIndicatorContainer(container)}
			<IndicatorChart {container} {relatedContainers} />
		{/if}
	</slot>

	<slot name="meta">
		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>
		{#if 'strategyType' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(container.payload.strategyType)}</p>
			</div>
		{:else if strategy}
			<div class="meta">
				<h3 class="meta-key">{$_('strategy')}</h3>
				<p class="meta-value">
					{#if $page.url.pathname === `/strategy/${strategy.guid}`}
						{$_(strategy.payload.title)}
					{:else}
						<a href={containerURL(strategy.payload.type, strategy.guid)}>
							{$_(strategy.payload.title)}
						</a>
					{/if}
				</p>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('strategy_type.label')}</h3>
				<p class="meta-value">{$_(strategy.payload.strategyType)}</p>
			</div>
		{/if}
		{#if measure}
			<div class="meta">
				<h3 class="meta-key">{$_('measure')}</h3>
				<p class="meta-value">
					<a href={containerURL(measure.payload.type, measure.guid)}>
						{$_(measure.payload.title)}
					</a>
				</p>
			</div>
		{/if}
		{#if 'measureType' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('measure_type')}</h3>
				<ul class="meta-value">
					{#each container.payload.measureType as measureType}
						<li>{$_(measureType)}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if 'topic' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('topic.label')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each container.payload.topic as topic}
						<li>{$_(topic)}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if 'category' in container.payload}
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
		{/if}
		{#if 'level' in container.payload && isLevel(container.payload.level)}
			<div class="meta">
				<h3 class="meta-key">{$_('level.label')}</h3>
				<p class="meta-value">{$_(container.payload.level)}</p>
			</div>
		{/if}
		{#if isContainer(container)}
			<div class="meta">
				<h3 class="meta-key">{$_('owned_by')}</h3>
				<ul class="meta-value">
					{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
						<li>{owner.payload.name}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if 'audience' in container.payload}
			<div class="meta">
				<h3 class="meta-key">{$_('audience')}</h3>
				<ul class="meta-value">
					{#each container.payload.audience as audience}
						<li>{$_(audience)}</li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if 'fulfillmentDate' in container.payload && container.payload.fulfillmentDate}
			<div class="meta">
				<h3 class="meta-key">{$_('fulfillment_date')}</h3>
				<p class="meta-value">
					{$date(new Date(container.payload.fulfillmentDate), { format: 'medium' })}
				</p>
			</div>
		{/if}
		{#if 'pdf' in container.payload && container.payload.pdf.length > 0}
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
		{#await organizationMembersRequest then organizationMembers}
			{@const organizationMembersByGuid = new Map(organizationMembers.map((m) => [m.guid, m]))}
			<div class="meta">
				<h3 class="meta-key">{$_('created_date')}</h3>
				<ul class="meta-value">
					<li>
						{getCreator(revisions[0]).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: revisions[0].valid_from,
										creator: getCreator(revisions[0])
											.filter((guid) => organizationMembersByGuid.has(guid))
											.map((guid) => organizationMembersByGuid.get(guid)?.display_name)
											.join(', ')
									}
								})
							: $date(revisions[0].valid_from, { format: 'long' })}
					</li>
				</ul>
			</div>
			<div class="meta">
				<h3 class="meta-key">{$_('modified_date')}</h3>
				<ul class="meta-value">
					<li>
						{getCreator(container).some((guid) => organizationMembersByGuid.has(guid))
							? $_('created_by', {
									values: {
										date: container.valid_from,
										creator: getCreator(container)
											.filter((guid) => organizationMembersByGuid.has(guid))
											.map((guid) => organizationMembersByGuid.get(guid)?.display_name)
											.join(', ')
									}
								})
							: $date(container.valid_from, { format: 'long' })}
					</li>
				</ul>
			</div>
		{/await}
		{#if $ability.can('read', container, 'visibility')}
			<div class="meta">
				<h3 class="meta-key">{$_('visible_for')}</h3>
				<ul class="meta-value">
					<li>{$_(`visibility.${container.payload.visibility}`)}</li>
				</ul>
			</div>
		{/if}
	</slot>
</article>
