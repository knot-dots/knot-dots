<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Pencil from '~icons/heroicons/pencil-solid';
	import { page } from '$app/stores';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import fetchMembers from '$lib/client/fetchMembers';
	import { getCreator, isIndicatorContainer, owners, predicates } from '$lib/models';
	import type { AnyContainer, Container, ObjectiveContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: ObjectiveContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: indicator = relatedContainers
		.filter(isIndicatorContainer)
		.find(
			({ revision }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-objective-for'] && object == revision
				) > -1
		);

	$: organizationMembersRequest = fetchMembers(container.organization);

	applicationState.update((state) => ({
		...state,
		containerDetailView: { tabs: [] }
	}));
</script>

<article class="details">
	<h2 class="details-title">
		{container.payload.title}
		{#if $ability.can('update', container)}
			<a class="button button-square quiet" href="#view={container.guid}&edit">
				<Pencil />
			</a>
		{/if}
	</h2>

	<div class="details-tab" id="basic-data">
		{#if indicator}
			<IndicatorChart
				container={indicator}
				{relatedContainers}
				containersWithObjectives={[container]}
				showObjectives
			/>
		{/if}

		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
		</div>

		{#if indicator}
			<div class="meta">
				<h3 class="meta-key">{$_('indicator_type')}</h3>
				<ul class="meta-value">
					{#each indicator.payload.indicatorType as indicatorType}
						<li>{$_(indicatorType)}</li>
					{/each}
				</ul>
			</div>

			<div class="meta">
				<h3 class="meta-key">{$_('indicator_category')}</h3>
				<ul class="meta-value meta-value--topic">
					{#each indicator.payload.indicatorCategory as indicatorCategory}
						<li>{$_(indicatorCategory)}</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="meta">
			<h3 class="meta-key">{$_('owned_by')}</h3>
			<ul class="meta-value">
				{#each owners( container, [...$page.data.organizations, ...$page.data.organizationalUnits] ) as owner}
					<li>{owner.payload.name}</li>
				{/each}
			</ul>
		</div>

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
	</div>
</article>
