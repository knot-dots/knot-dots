<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Trash from '~icons/heroicons/trash';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import createEffect from '$lib/client/createEffect';
	import createObjective from '$lib/client/createObjective';
	import deleteContainer from '$lib/client/deleteContainer';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog.svelte';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Visibility from '$lib/components/Visibility.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		audience,
		type Container,
		type CustomEventMap,
		indicatorCategories,
		indicatorTypes,
		isIndicatorContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		policyFieldBNK,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import {
		addEffectState,
		addObjectiveState,
		mayDeleteContainer,
		overlayHistory
	} from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: Container[];
	}

	let { container: originalContainer, relatedContainers }: Props = $props();

	let container = $state(originalContainer);

	// svelte-ignore non_reactive_update
	let confirmDeleteDialog: HTMLDialogElement;

	let hashParams = $derived(paramsFromFragment(page.url));

	async function afterSubmit(
		{ detail }: CustomEvent<CustomEventMap['submitSuccessful']>,
		c: AnyContainer
	) {
		if (
			hashParams.has(overlayKey.enum.create) &&
			isIndicatorContainer(detail.result) &&
			$addEffectState.target
		) {
			const effect = await createEffect($addEffectState.target, detail.result);
			$addEffectState = {};
			await goto(`#view=${effect.guid}&edit`, { invalidateAll: true });
		} else if (
			hashParams.has(overlayKey.enum.create) &&
			isIndicatorContainer(detail.result) &&
			$addObjectiveState.target
		) {
			const objective = await createObjective($addObjectiveState.target, detail.result);
			$addObjectiveState = {};
			await goto(`#view=${objective.guid}&edit`, { invalidateAll: true });
		} else if (hashParams.has('create')) {
			await goto(`#view=${detail.result.guid}`, { invalidateAll: true });
		} else {
			await goto(`#view=${c.guid}`, { invalidateAll: true });
		}
	}

	async function handleDelete(c: AnyContainer) {
		const response = await deleteContainer(c);
		if (response.ok) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
				await goto(`#${newParams.toString()}`, { invalidateAll: true });
			} else {
				await goto(closeURL(), { invalidateAll: true });
			}
		}
		confirmDeleteDialog.close();
	}

	function cancelURL() {
		const newParams = new URLSearchParams(hashParams);

		if (newParams.has(overlayKey.enum['edit-help'])) {
			newParams.delete(overlayKey.enum['edit-help']);
		} else {
			newParams.delete(overlayKey.enum.create);
			newParams.delete(overlayKey.enum.edit);
		}

		return `#${newParams.toString()}`;
	}

	function closeURL() {
		if (hashParams.has(overlayKey.enum['view-help'])) {
			const newParams = new URLSearchParams(
				[...hashParams.entries()].filter(([key]) => key != overlayKey.enum['view-help'])
			);
			return `#${newParams.toString()}`;
		} else {
			const newParams = new URLSearchParams(
				[...hashParams.entries()].filter(([key]) => key == overlayKey.enum.relate)
			);
			return `#${newParams.toString()}`;
		}
	}

	let facets = $derived.by(() => {
		if (isIndicatorContainer(container)) {
			return new Map([
				['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
				['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
				['audience', new Map(audience.options.map((v) => [v as string, 0]))],
				['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
				['topic', new Map(topics.options.map((v) => [v as string, 0]))],
				['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))]
			]);
		}
	});
</script>

<Header {facets} search={!!facets} sortOptions={facets ? undefined : []} />
<div class="content-details masked-overflow">
	<ContainerForm bind:container on:submitSuccessful={(e) => afterSubmit(e, container)} />
</div>
{#if !isIndicatorContainer(container) || container.payload.quantity}
	<footer class="content-footer">
		{#if container.payload.type !== payloadTypes.enum.undefined}
			<Visibility {container} />
		{/if}
		<div class="content-actions">
			{#if container.payload.type !== payloadTypes.enum.undefined}
				<button class="primary" form="container-form" type="submit">{$_('save')}</button>
			{/if}
			<a class="button" href={cancelURL()}>{$_('cancel')}</a>
			{#if $mayDeleteContainer(container)}
				<button
					class="delete quiet"
					title={$_('delete')}
					type="button"
					onclick={() => confirmDeleteDialog.showModal()}
				>
					<Trash />
				</button>
			{/if}
		</div>
	</footer>
{/if}

<Help slug={`${container.payload.type.replace('_', '-')}-edit`} />

<ConfirmDeleteDialog
	bind:dialog={confirmDeleteDialog}
	handleSubmit={() => handleDelete(container)}
	{container}
	{relatedContainers}
/>
