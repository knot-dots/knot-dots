<script lang="ts">
	import { _ } from 'svelte-i18n';
	import IndicatorWizard from '$lib/components/IndicatorWizard.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import {
		levels,
		payloadTypes,
		status,
		strategyTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import type { Container } from '$lib/models';

	export let container: Container;
	export let isPartOfOptions: Container[];
	export let relatedContainers: Container[];
</script>

<form class="details" method="POST" on:submit|preventDefault>
	<header>
		<label>
			{$_(container.payload.type)}
			<input name="title" type="text" value={container.payload.title} required />
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				<textarea name="summary" maxlength="200" value={container.payload.summary ?? ''} required />
			</label>
			<label>
				{$_('description')}
				<textarea name="description" value={container.payload.description} required />
			</label>
			{#if 'indicator' in container.payload}
				<IndicatorWizard
					bind:indicator={container.payload.indicator}
					locked={container.payload.indicator.length > 0}
				/>
			{/if}
			{#if container.payload.type === payloadTypes.enum.measure}
				{#each relatedContainers as o}
					{#if 'indicator' in o.payload && o.payload.indicator.length > 0 && 'quantity' in o.payload.indicator[0]}
						<label>
							{$_(`${o.payload.indicator[0].quantity}.input_prompt`)}
							<input
								type="text"
								inputmode="numeric"
								name="indicatorContribution-{o.guid}"
								value={'indicatorContribution' in container.payload
									? container.payload.indicatorContribution?.[o.guid]
									: ''}
							/>
						</label>
					{/if}
				{/each}
			{/if}
		</div>
		<div class="details-content-column">
			{#if 'status' in container.payload}
				<label>
					{$_('status.label')}
					<select name="status" required>
						{#each status.options as statusOption}
							<option selected={statusOption === container.payload.status} value={statusOption}>
								{$_(statusOption)}
							</option>
						{/each}
					</select>
				</label>
			{:else if 'level' in container.payload && 'strategyType' in container.payload && 'topic' in container.payload}
				<label>
					{$_('level.label')}
					<select name="level" required>
						{#each levels.options as levelOption}
							<option selected={levelOption === container.payload.level} value={levelOption}>
								{$_(levelOption)}
							</option>
						{/each}
					</select>
				</label>
				<label>
					{$_('strategy_type.label')}
					<select name="strategy-type" required>
						{#each strategyTypes.options as strategyTypeOption}
							<option
								selected={strategyTypeOption === container.payload.strategyType}
								value={strategyTypeOption}
							>
								{$_(strategyTypeOption)}
							</option>
						{/each}
					</select>
				</label>
				<label>
					{$_('topic.label')}
					<select name="topic" required>
						{#each topics.options as topicOption}
							<option selected={topicOption === container.payload.topic} value={topicOption}>
								{$_(topicOption)}
							</option>
						{/each}
					</select>
				</label>
			{/if}
			<label>
				{$_('category')}
				<select name="category" required>
					<option label="" />
					{#each sustainableDevelopmentGoals.options as goal}
						<option selected={goal === container.payload.category} value={goal}>
							{$_(goal)}
						</option>
					{/each}
				</select>
			</label>
			<RelationSelector
				{isPartOfOptions}
				payloadType={container.payload.type}
				selected={container.relation}
			/>
		</div>
	</div>

	<footer>
		<slot name="footer" />
	</footer>
</form>
