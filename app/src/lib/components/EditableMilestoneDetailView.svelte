<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableDate from '$lib/components/EditableDate.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableMeasure from '$lib/components/EditableMeasure.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableTaskCarousel from '$lib/components/EditableTaskCarousel.svelte';
	import { type AnyContainer, type Container, type MilestoneContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: MilestoneContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<EditableDate
			editable={$applicationState.containerDetailView.editable}
			label={$_('fulfillment_date')}
			bind:value={container.payload.fulfillmentDate}
		/>

		<EditableMeasure {container} editable={$applicationState.containerDetailView.editable} />

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		<EditableOrganization
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organization')}
			bind:value={container.organization}
		/>

		<EditableOrganizationalUnit
			editable={$applicationState.containerDetailView.editable &&
				$ability.can('update', container.payload.type, 'organizational_unit')}
			organization={container.organization}
			bind:value={container.organizational_unit}
		/>
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.description}
		/>

		<div class="details-tab" id="tasks">
			<h3>{$_('tasks')}</h3>
			<EditableTaskCarousel {container} editable={$applicationState.containerDetailView.editable} />
		</div>
	</svelte:fragment>
</EditableContainerDetailView>
