<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import GoalProperties from '$lib/components/GoalProperties.svelte';
	import {
		type Container,
		type ContainerWithEffect,
		type GoalContainer,
		isContainerWithEffect,
		isEffectContainer,
		isPartOf,
		isPartOfMeasure,
		overlayKey
	} from '$lib/models';
	import { ability, addEffectState, applicationState } from '$lib/stores';

	interface Props {
		container: GoalContainer;
		relatedContainers: any[];
		revisions: any[];
	}

	let { container = $bindable(), relatedContainers, revisions }: Props = $props();

	let measure = $derived(
		relatedContainers.filter(isContainerWithEffect).find((rc) => isPartOfMeasure(rc)(container))
	);

	let effect = $derived(relatedContainers.filter(isEffectContainer).find(isPartOf(container)));

	async function addEffect(target: Container, measure: ContainerWithEffect) {
		const params = new URLSearchParams([
			[overlayKey.enum['indicator-catalog'], ''],
			['alreadyInUse', '']
		]);

		for (const category of measure.payload.category) {
			params.append('category', category);
		}

		for (const topic of measure.payload.topic) {
			params.append('topic', topic);
		}

		for (const measureType of measure.payload.measureType) {
			params.append('measureType', measureType);
		}

		$addEffectState = { target };

		await goto(`#${params.toString()}`);
	}
</script>

<EditableContainerDetailView bind:container {relatedContainers} {revisions}>
	{#snippet data()}
		<GoalProperties
			bind:container
			editable={$applicationState.containerDetailView.editable && $ability.can('update', container)}
			{relatedContainers}
			{revisions}
		/>

		{#key container.guid}
			<EditableFormattedText
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				label={$_('description')}
				bind:value={container.payload.description}
			/>
		{/key}
	{/snippet}
</EditableContainerDetailView>
