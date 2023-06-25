<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import { key } from '$lib/authentication';
	import type { KeycloakContext } from '$lib/authentication';
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
	import type {
		Indicator,
		Level,
		NewContainer,
		Payload,
		PayloadType,
		Relation,
		Status,
		StrategyType,
		SustainableDevelopmentGoal,
		Topic
	} from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	const { getKeycloak } = getContext<KeycloakContext>(key);

	$: payloadType = $page.params.type as PayloadType;

	$: level = $page.params.level as Level;

	$: isPartOfOptions = data.isPartOfOptions;

	$: selected = $page.url.searchParams
		.getAll('is-part-of')
		.map((o): Relation => ({ object: Number(o), predicate: 'is-part-of', subject: 0 }));

	let indicator = [] as Indicator[];

	async function handleSubmit(event: SubmitEvent) {
		const data = new FormData(event.target as HTMLFormElement);

		const basePayload = {
			category: data.get('category') as SustainableDevelopmentGoal,
			description: data.get('description') as string,
			summary: data.get('summary') as string,
			title: data.get('title') as string,
			type: payloadType
		};

		let payload;

		if (payloadType === payloadTypes.enum.measure) {
			payload = {
				...basePayload,
				status: data.get('status') as Status,
				type: payloadTypes.enum.measure
			};
		} else if (payloadType === payloadTypes.enum.operational_goal) {
			payload = {
				...basePayload,
				indicator: indicator,
				type: payloadTypes.enum.operational_goal
			};
		} else if (payloadType === payloadTypes.enum.strategy) {
			payload = {
				...basePayload,
				level: data.get('level') as Level,
				strategyType: data.get('strategy-type') as StrategyType,
				topic: data.get('topic') as Topic,
				type: payloadTypes.enum.strategy
			};
		} else {
			payload = basePayload;
		}

		const container: NewContainer = {
			payload: payload as Payload,
			realm: env.PUBLIC_KC_REALM ?? '',
			relation: data
				.getAll('is-part-of')
				.map((v) => ({ predicate: 'is-part-of', object: Number(v) })),
			user: []
		};

		// Ensure a fresh token will be included in the Authorization header.
		await getKeycloak()
			.updateToken(-1)
			.catch((reason) => reason);
		const response = await fetch('/container', {
			method: 'POST',
			body: JSON.stringify(container),
			headers: {
				...(sessionStorage.getItem('token')
					? { Authorization: `Bearer ${sessionStorage.getItem('token')}` }
					: undefined),
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const result = await response.json();

			if (event.submitter?.id === 'save-and-create-model') {
				await goto(`/model/new?is-part-of=${result.revision}`);
			} else if (event.submitter?.id === 'save-and-create-strategic-goal') {
				await goto(`/strategic_goal/new?is-part-of=${result.revision}`);
			} else if (event.submitter?.id === 'save-and-create-operational-goal') {
				await goto(`/operational_goal/new?is-part-of=${result.revision}`);
			} else if (event.submitter?.id === 'save-and-create-measure') {
				await goto(`/measure/new?is-part-of=${result.revision}`);
			} else {
				await goto(`/${payloadType}/${result.guid}`);
			}
		}
	}
</script>

<form class="details" method="POST" on:submit|preventDefault={handleSubmit}>
	<header>
		<label>
			{$_(payloadType)}
			{#key payloadType}
				<input name="title" type="text" required />
			{/key}
		</label>
	</header>

	<div class="details-content">
		<div class="details-content-column">
			<label>
				{$_('summary')}
				{#key payloadType}
					<textarea name="summary" maxlength="200" required />
				{/key}
			</label>
			<label>
				{$_('description')}
				{#key payloadType}
					<textarea name="description" required />
				{/key}
			</label>
			{#if payloadType === payloadTypes.enum.operational_goal}
				<IndicatorWizard bind:indicator />
			{/if}
		</div>
		<div class="details-content-column">
			{#if payloadType === payloadTypes.enum.measure}
				<label>
					{$_('status.label')}
					<select name="status" required>
						{#each status.options as statusOption}
							<option value={statusOption}>
								{$_(statusOption)}
							</option>
						{/each}
					</select>
				</label>
			{:else if payloadType === payloadTypes.enum.strategy}
				<label>
					{$_('level.label')}
					<select name="level" required>
						{#each levels.options as levelOption}
							<option value={levelOption} selected={levelOption.includes(level) ? true : false}>
								{$_(levelOption)}
							</option>
						{/each}
					</select>
				</label>
				<label>
					{$_('strategy_type.label')}
					<select name="strategy-type" required>
						{#each strategyTypes.options as strategyTypeOption}
							<option value={strategyTypeOption}>
								{$_(strategyTypeOption)}
							</option>
						{/each}
					</select>
				</label>
				<label>
					{$_('topic.label')}
					<select name="topic" required>
						{#each topics.options as topicOption}
							<option value={topicOption}>
								{$_(topicOption)}
							</option>
						{/each}
					</select>
				</label>
			{/if}
			<label>
				{$_('category')}
				{#key payloadType}
					<select name="category" required>
						<option label="" />
						{#each sustainableDevelopmentGoals.options as goal}
							<option value={goal}>
								{$_(goal)}
							</option>
						{/each}
					</select>
				{/key}
			</label>
			<RelationSelector {payloadType} {isPartOfOptions} {selected} />
		</div>
	</div>

	<footer>
		<button class="primary">{$_('save')}</button>
		{#if payloadType === payloadTypes.enum.strategy}
			<button id="save-and-create-model">
				{$_('save_and_create_model')}
			</button>
		{:else if payloadType === payloadTypes.enum.model}
			<button id="save-and-create-strategic-goal">
				{$_('save_and_create_strategic_goal')}
			</button>
		{:else if payloadType === payloadTypes.enum.strategic_goal}
			<button id="save-and-create-operational-goal">
				{$_('save_and_create_operational_goal')}
			</button>
		{:else if payloadType === payloadTypes.enum.operational_goal}
			<button id="save-and-create-measure">
				{$_('save_and_create_measure')}
			</button>
		{/if}
	</footer>
</form>
