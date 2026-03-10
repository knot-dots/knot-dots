<script lang="ts">
	import { getContext } from 'svelte';
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { env } from '$env/dynamic/public';
	import {
		containerOfType,
		paramsFromFragment,
		payloadTypes,
		type NewContainer,
		type PayloadType,
		type WorkspaceContainer
	} from '$lib/models';
	import { newContainer, overlay as overlayStore } from '$lib/stores';
	import type { WorkspaceFilters } from '$lib/workspaceFilters';
	import { filtersFromUrl, filtersFromWorkspaceOverlay } from '$lib/workspaceFilters';

	interface Props {
		defaultPayloadType?: PayloadType[];
		customCategoryKeys?: string[];
	}

	let { defaultPayloadType = [], customCategoryKeys = [] }: Props = $props();

	let title = $state('');
	let description = $state('');
	let favorite = $state(false);

	const createContainerDialog =
		getContext<{ getElement: () => HTMLDialogElement }>('createContainerDialog') ?? null;

	function currentFilters(): WorkspaceFilters {
		if ($overlayStore?.key === 'workspace') {
			const filters = filtersFromWorkspaceOverlay(
				$overlayStore.container.payload.filters as Record<string, unknown>,
				paramsFromFragment(page.url),
				customCategoryKeys
			);
			filters.payloadType = filters.payloadType.filter((pt) => pt !== payloadTypes.enum.workspace);
			if (filters.payloadType.length === 0 && defaultPayloadType.length > 0) {
				filters.payloadType = defaultPayloadType.filter((pt) => pt !== payloadTypes.enum.workspace);
			}
			return filters;
		}

		const fromUrl = filtersFromUrl(new URL(page.url), customCategoryKeys);
		if (fromUrl.payloadType.length === 0 && defaultPayloadType.length > 0) {
			return { ...fromUrl, payloadType: defaultPayloadType };
		}

		return fromUrl;
	}

	function handleCreate() {
		title = '';
		description = '';
		favorite = false;
		const base = containerOfType(
			payloadTypes.enum.workspace,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		base.payload = {
			...(base.payload as WorkspaceContainer['payload']),
			title,
			description,
			favorite,
			filters: currentFilters() as WorkspaceContainer['payload']['filters']
		};

		$newContainer = base;
		createContainerDialog?.getElement().showModal();
	}
</script>

<button class="button button-primary button-xs" onclick={handleCreate} type="button">
	<Plus />
	{$_('workspace.save_as_workspace')}
</button>
