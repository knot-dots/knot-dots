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
		isTaskContainer,
		type MeasureContainer,
		type PartialRelation,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { isMeasureMilestoneContainer } from '$lib/models.js';

	export let container: AnyContainer | EmptyContainer;

	let isPartOfOptionsRequest: Promise<AnyContainer[]> = new Promise(() => []);
	let isPartOfMeasureOptionsRequest: Promise<MeasureContainer[]> = new Promise(() => []);

	let allowedSuperordinateTypes = [
		payloadTypes.enum.measure_milestone,
		payloadTypes.enum.measure_result
	];

	onMount(() => {
		isPartOfMeasureOptionsRequest = fetchContainers({
			organization: [container.organization],
			...(container.organizational_unit
				? { organizationalUnit: [container.organizational_unit] }
				: undefined),
			payloadType: [payloadTypes.enum.measure]
		}) as Promise<MeasureContainer[]>;

		if (isTaskContainer(container)) {
			const measureRevision = container.relation.find(
				({ predicate }) => predicate === predicates.enum['is-part-of-measure']
			)?.object;

			if (measureRevision) {
				isPartOfOptionsRequest = fetchContainers({
					isPartOfMeasure: [measureRevision],
					payloadType: allowedSuperordinateTypes
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
			{
				object: parseInt(event.currentTarget.value),
				position: 0,
				predicate: predicates.enum['is-part-of-measure'],
				...('revision' in container ? { subject: container.revision } : undefined)
			},
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

	function onChangeIsPartOf(event: { currentTarget: HTMLInputElement }) {
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
	<label
		>{$_('measure')}
		<select name="isPartOfMeasure" on:change={onChangeIsPartOfMeasure}>
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

{#if isTaskContainer(container)}
	{#await isPartOfOptionsRequest then isPartOfOptions}
		{#if isPartOfOptions.length > 0}
			{@const optionGroups = [
				{
					heading: $_('measure_results'),
					options: isPartOfOptions.filter(isMeasureResultContainer)
				},
				{
					heading: $_('measure_milestones'),
					options: isPartOfOptions.filter(isMeasureMilestoneContainer)
				}
			]}
			<fieldset>
				<legend>{$_('superordinate_element')}</legend>
				<ul class="superordinate-element-options masked-overflow">
					{#each optionGroups as group}
						{#if group.options.length > 0}
							<li>
								<p>{group.heading}</p>
								<ul>
									{#each group.options as option}
										<li>
											<label>
												<input
													type="radio"
													name="is-part-of"
													value={option.revision}
													checked={container.relation.findIndex(
														(r) =>
															r.predicate === predicates.enum['is-part-of'] &&
															r.object === option.revision
													) > -1}
													on:change={onChangeIsPartOf}
												/>
												{#if 'name' in option.payload}
													{option.payload.name}
												{:else}
													{option.payload.title}
												{/if}
											</label>
										</li>
									{/each}
								</ul>
							</li>
						{/if}
					{/each}
				</ul>
			</fieldset>
		{/if}
	{/await}
{/if}

<style>
	fieldset {
		padding: 0 1rem;
	}

	.superordinate-element-options {
		--mask-height: 0.5rem;

		max-height: 8.5rem;
		padding: 0.5rem 0;
	}

	.superordinate-element-options p {
		margin-bottom: 0.25rem;
	}

	.superordinate-element-options ul li {
		margin: 0.25rem 0;
	}
</style>
