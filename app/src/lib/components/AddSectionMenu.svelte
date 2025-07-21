<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Plus from '~icons/flowbite/plus-outline';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartLine from '~icons/knotdots/chart-line';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Text from '~icons/knotdots/text';
	import saveContainer from '$lib/client/saveContainer';
	import {
		anyContainer,
		type AnyContainer,
		containerOfType,
		isContainerWithTitle,
		isEffectCollectionContainer,
		isGoalContainer,
		isObjectiveCollectionContainer,
		isTaskCollectionContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { mayCreateContainer } from '$lib/stores';

	interface Props {
		parentContainer: AnyContainer;
		position: number;
		relatedContainers: AnyContainer[];
	}

	let { parentContainer, position, relatedContainers = $bindable() }: Props = $props();

	let menu = createMenu({ label: $_('add_section') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };

	let mayAddTaskCollection = $derived(
		isGoalContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isTaskCollectionContainer)
	);

	let mayAddObjectiveCollection = $derived(
		isGoalContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isObjectiveCollectionContainer) &&
			!parentContainer.relation.some(
				({ predicate }) => predicate == predicates.enum['is-part-of-measure']
			)
	);

	let mayAddEffectCollection = $derived(
		isGoalContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isEffectCollectionContainer) &&
			parentContainer.relation.some(
				({ predicate }) => predicate == predicates.enum['is-part-of-measure']
			)
	);

	let options = $derived(
		[
			{ icon: Text, label: $_('text'), value: payloadTypes.enum.text },
			...(mayAddTaskCollection
				? [
						{
							icon: ClipboardCheck,
							label: $_('tasks'),
							value: payloadTypes.enum.task_collection
						}
					]
				: []),
			...(mayAddEffectCollection
				? [
						{
							icon: ChartBar,
							label: $_('effect'),
							value: payloadTypes.enum.effect_collection
						}
					]
				: []),
			...(mayAddObjectiveCollection
				? [
						{
							icon: ChartLine,
							label: $_('objectives'),
							value: payloadTypes.enum.objective_collection
						}
					]
				: [])
		].toSorted((a, b) => a.label.localeCompare(b.label))
	);

	function addSection(to: AnyContainer, position: number) {
		return async (event: Event) => {
			const payloadType = payloadTypes.safeParse((event as CustomEvent).detail.selected).data;

			if (!payloadType) {
				return;
			}

			const newContainer = containerOfType(
				payloadType,
				to.organization,
				to.organizational_unit,
				to.managed_by,
				to.realm
			) as NewContainer;

			newContainer.relation = [
				{
					object: to.guid,
					position,
					predicate: predicates.enum['is-section-of']
				}
			];

			if (isContainerWithTitle(newContainer)) {
				newContainer.payload.title = '';
			}

			const response = await saveContainer(newContainer);
			const result = anyContainer.safeParse(await response.json());
			if (result.success) {
				parentContainer.relation.push(
					...result.data.relation.filter(
						({ predicate }) => predicate == predicates.enum['is-section-of']
					)
				);
				relatedContainers.push(result.data);
			}
		};
	}
</script>

<div class="dropdown" use:popperRef>
	<button
		class="dropdown-button"
		onchange={addSection(parentContainer, position)}
		type="button"
		use:menu.button
	>
		<Plus />
		<span class="is-visually-hidden">{$_('add_section')}</span>
	</button>

	{#if $menu.expanded}
		<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
			<p class="dropdown-panel-title">{$_('add_section')}</p>
			<ul class="menu">
				{#each options as option}
					{#if $mayCreateContainer(option.value, parentContainer.managed_by)}
						<li class="menu-item">
							<button use:menu.item={{ value: option.value }}>
								<option.icon />
								{option.label}
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-default-background: var(--color-primary-700);
		--dropdown-button-expanded-background: var(--color-primary-900);
		--dropdown-button-hover-background: var(--color-primary-800);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-icon-default-color: white;
		--dropdown-button-icon-expanded-color: white;

		align-items: center;
		background-color: white;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-700);
		display: flex;
		gap: 0.375rem;
		padding: 0.375rem;
		width: fit-content;
	}

	.dropdown-panel {
		border-radius: 16px;
	}

	.dropdown-panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
	}

	.menu-item > button {
		color: var(--color-gray-700);
	}

	.menu-item > button > :global(svg) {
		color: var(--color-gray-500);
	}
</style>
