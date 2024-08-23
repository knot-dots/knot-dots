<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import {
		type AnyContainer,
		type EmptyContainer,
		isMeasureResultContainer,
		isMilestoneContainer,
		isTaskContainer,
		type MeasureContainer,
		type PartialRelation,
		payloadTypes,
		predicates
	} from '$lib/models';

	export let container: AnyContainer | EmptyContainer;

	let isPartOfOptionsRequest: Promise<AnyContainer[]> = new Promise(() => []);
	let isPartOfMeasureOptionsRequest: Promise<MeasureContainer[]> = new Promise(() => []);

	onMount(() => {
		isPartOfMeasureOptionsRequest = fetchContainers({
			organization: [container.organization],
			...(container.organizational_unit
				? { organizationalUnit: [container.organizational_unit] }
				: undefined),
			payloadType: [payloadTypes.enum.measure]
		}) as Promise<MeasureContainer[]>;

		const measureRevision = container.relation.find(
			({ predicate }) => predicate === predicates.enum['is-part-of-measure']
		)?.object;

		if (isMilestoneContainer(container)) {
			if (measureRevision) {
				isPartOfOptionsRequest = fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result]
				});
			}
		} else if (isTaskContainer(container)) {
			if (measureRevision) {
				isPartOfOptionsRequest = fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: [payloadTypes.enum.measure_result, payloadTypes.enum.milestone]
				});
			}
		}
	});

	if (container.relation.length == 0) {
		container.relation = paramsFromURL($page.url)
			.getAll('is-part-of')
			.map(
				(o): PartialRelation => ({
					object: Number(o),
					position: 0,
					predicate: 'is-part-of'
				})
			)
			.concat(
				paramsFromURL($page.url)
					.getAll('is-part-of-measure')
					.map(
						(o): PartialRelation => ({
							object: Number(o),
							position: 0,
							predicate: 'is-part-of-measure'
						})
					)
			);
	}

	function onChangeIsPartOfMeasure(event: { currentTarget: HTMLSelectElement }) {
		const isPartOfMeasureIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				('revision' in container ? subject == container.revision : true)
		);

		container.relation = [
			...container.relation.slice(0, isPartOfMeasureIndex),
			...(event.currentTarget.value
				? [
						{
							object: parseInt(event.currentTarget.value),
							position: 0,
							predicate: predicates.enum['is-part-of-measure'],
							...('revision' in container ? { subject: container.revision } : undefined)
						}
					]
				: []),
			...container.relation.slice(isPartOfMeasureIndex + 1)
		];

		if (container.payload.type === payloadTypes.enum.task) {
			const isPartOfIndex = container.relation.findIndex(
				({ predicate, subject }) =>
					predicate === predicates.enum['is-part-of'] &&
					('revision' in container ? subject == container.revision : true)
			);
			container.relation = [
				...container.relation.slice(0, isPartOfIndex),
				{
					object: parseInt(event.currentTarget.value),
					position: 0,
					predicate: predicates.enum['is-part-of'],
					...('revision' in container ? { subject: container.revision } : undefined)
				},
				...container.relation.slice(isPartOfIndex + 1)
			];
		}
	}

	function onChangeIsPartOf(event: { currentTarget: HTMLSelectElement }) {
		const isPartOfIndex = container.relation.findIndex(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-part-of'] &&
				('revision' in container ? subject == container.revision : true)
		);

		container.relation = [
			...container.relation.slice(0, isPartOfIndex),
			{
				object: parseInt(event.currentTarget.value),
				position: 0,
				predicate: predicates.enum['is-part-of'],
				...('revision' in container ? { subject: container.revision } : undefined)
			},
			...container.relation.slice(isPartOfIndex + 1)
		];
	}
</script>

{#await isPartOfMeasureOptionsRequest then measureContainers}
	<label class="meta">
		<span class="meta-key">{$_('measure')}</span>
		<select class="meta-value" name="isPartOfMeasure" on:change={onChangeIsPartOfMeasure}>
			<option></option>
			{#each measureContainers as option}
				<option
					value={option.revision}
					selected={container.relation.findIndex(
						(r) =>
							r.predicate === predicates.enum['is-part-of-measure'] && r.object === option.revision
					) > -1}
				>
					{option.payload.title}
				</option>
			{/each}
		</select>
	</label>
{/await}

{#if isTaskContainer(container) || isMilestoneContainer(container)}
	{#await isPartOfOptionsRequest then isPartOfOptions}
		{#if isPartOfOptions.length > 0}
			{@const optionGroups = [
				{
					heading: $_('measure_results'),
					options: isPartOfOptions.filter(isMeasureResultContainer)
				},
				{
					heading: $_('milestones'),
					options: isPartOfOptions.filter(isMilestoneContainer)
				}
			]}
			<label class="meta">
				<span class="meta-key">{$_('superordinate_element')}</span>
				<select class="meta-value" name="isParOf" on:change={onChangeIsPartOf}>
					{#each optionGroups as group}
						{#if group.options.length > 0}
							<optgroup label={group.heading}>
								{#each group.options as option}
									<option
										selected={container.relation.findIndex(
											(r) =>
												r.predicate === predicates.enum['is-part-of'] &&
												r.object === option.revision
										) > -1}
									>
										{#if 'name' in option.payload}
											{option.payload.name}
										{:else}
											{option.payload.title}
										{/if}
									</option>
								{/each}
							</optgroup>
						{/if}
					{/each}
				</select>
			</label>
		{/if}
	{/await}
{/if}
