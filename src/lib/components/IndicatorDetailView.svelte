<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Card from '$lib/components/Card.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		isModelContainer,
		isOperationalGoalContainer,
		isStrategicGoalGoalContainer,
		owners
	} from '$lib/models';
	import type { AnyContainer, Container, IndicatorContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';
	import { sdgIcons } from '$lib/theme/models';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	applicationState.update((state) => ({
		...state,
		containerDetailView: { tabs: [] }
	}));
</script>

<article class="details">
	<div class="details-tab" id="basic-data">
		<div class="description">
			<h3>{$_('description')}</h3>
			<Viewer value={container.payload.description} />
		</div>

		<IndicatorChart {container} {relatedContainers} />

		<div class="objectives">
			<h3>{$_('objectives')}</h3>
			<ul class="carousel">
				{#each relatedContainers.filter((c) => isModelContainer(c) || isOperationalGoalContainer(c) || isStrategicGoalGoalContainer(c)) as objective}
					<li>
						<Card --height="100%" container={objective} />
					</li>
				{/each}
			</ul>
		</div>

		<div class="meta">
			<h3 class="meta-key">{$_('object')}</h3>
			<p class="meta-value">{$_(container.payload.type)}</p>
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
</article>
