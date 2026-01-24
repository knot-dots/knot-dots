<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import saveContainer from '$lib/client/saveContainer';
	import BinaryIndicatorProperties from '$lib/components/BinaryIndicatorProperties.svelte';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import Header from '$lib/components/Header.svelte';
	import {
		type ActualDataPayload,
		type AnyPayload,
		type BinaryIndicatorPayload,
		type Container,
		containerOfType,
		isContainerWithPayloadType,
		type NewContainer,
		payloadTypes
	} from '$lib/models';
	import { fetchContainersRelatedToIndicatorTemplates } from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<BinaryIndicatorPayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let title = $derived(container.payload.title);

	let newActualDataContainer = $derived.by(() => {
		const newActualDataContainer = containerOfType(
			payloadTypes.enum.actual_data,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM
		) as Omit<NewContainer, 'payload'> & Pick<Container<ActualDataPayload>, 'payload'>;
		newActualDataContainer.payload.indicator = guid;
		newActualDataContainer.payload.title = title;
		return newActualDataContainer;
	});

	let relatedContainersQuery = $derived(
		fetchContainersRelatedToIndicatorTemplates({
			guid,
			params: {
				organization: page.data.currentOrganization.guid,
				...(page.data.currentOrganizationalUnit
					? { organizationalUnit: page.data.currentOrganizationalUnit.guid }
					: undefined)
			}
		})
	);

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let actualDataContainer = $derived(
		relatedContainers
			.filter((c) => isContainerWithPayloadType(payloadTypes.enum.actual_data, c))
			.filter(({ payload }) => payload.indicator === container.guid)
			.map((c) => {
				let _ = $state(c);
				return _;
			})
			.at(0)
	);

	let addingActualData = $state(false);

	function addActualData(container: NewContainer) {
		return async (event: Event) => {
			event.stopPropagation();
			addingActualData = true;

			try {
				const response = await saveContainer(container);
				if (response.ok) {
					await relatedContainersQuery.refresh();
					await invalidate('containers');
				} else {
					const error = await response.json();
					alert(error.message);
				}
			} catch (error: unknown) {
				console.error(error);
			} finally {
				addingActualData = false;
			}
		};
	}

	function updateActualData(container: Container<ActualDataPayload>) {
		return async (value: boolean) => {
			container.payload.booleanValue = value;

			try {
				const response = await saveContainer(container);
				if (response.ok) {
					const updatedContainer = await response.json();
					container.revision = updatedContainer.revision;
					await invalidate('containers');
				} else {
					const error = await response.json();
					alert(error.message);
				}
			} catch (error: unknown) {
				console.error(error);
			}
		};
	}
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<BinaryIndicatorProperties
				bind:container
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
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

			<div class="details-section" oninput={(e) => e.stopPropagation()}>
				{#if $applicationState.containerDetailView.editable && !actualDataContainer && $ability.can('create', newActualDataContainer)}
					{#if addingActualData}
						<span class="loader"></span>
					{:else}
						<button onclick={addActualData(newActualDataContainer)} type="button">
							{$_('binary_indicator.add_actual_data')}
						</button>
					{/if}
				{:else if actualDataContainer}
					<BooleanValueToggle
						bind:checked={
							() => actualDataContainer?.payload.booleanValue ?? false,
							updateActualData(actualDataContainer)
						}
						disabled={!$applicationState.containerDetailView.editable ||
							!$ability.can('update', actualDataContainer)}
						label={$_('binary_indicator.actual_data')}
					/>
				{/if}
			</div>
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
