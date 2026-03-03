<script lang="ts" generics="T extends AnyContainer">
	import { getContext, type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Card from '$lib/components/Card.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import {
		type AnyContainer,
		containerOfType,
		type NewContainer,
		type PayloadType
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		containers: T[];
		item?: Snippet<[T]>;
		payloadType: PayloadType[];
		createParams?: URLSearchParams;
	}

	let { containers, item, payloadType, createParams }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer(payloadType: PayloadType) {
		$newContainer = containerOfType(
			payloadType,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer;

		if (createParams) {
			const applyFilterDefaults = (key: string) => {
				const values = createParams.getAll(key).filter(Boolean);
				if (!values.length) return;
				const payload = $newContainer?.payload as Record<string, unknown> | undefined;
				if (!payload || !(key in payload)) return;
				payload[key] = Array.isArray(payload[key]) ? values : values[0];
			};

			applyFilterDefaults('audience');
			applyFilterDefaults('category');
			applyFilterDefaults('indicatorCategory');
			applyFilterDefaults('indicatorType');
			applyFilterDefaults('measureType');
			applyFilterDefaults('policyFieldBNK');
			applyFilterDefaults('programType');
			applyFilterDefaults('taskCategory');
			applyFilterDefaults('topic');
		}

		createContainerDialog.getElement().showModal();
	}
</script>

<div>
	{#if payloadType.some( (t) => $mayCreateContainer(t, page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid) )}
		{#if payloadType.length === 1}
			<p>
				<button
					class="button button-primary button-xs"
					onclick={() => createContainer(payloadType[0])}
					type="button"
				>
					<Plus />
					{$_(payloadType[0])}
				</button>
			</p>
		{:else}
			<DropDownMenu
				handleChange={(e) =>
					e instanceof CustomEvent && e.detail.selected && createContainer(e.detail.selected)}
				label={$_('object')}
				options={[
					...payloadType
						.filter((t) =>
							$mayCreateContainer(
								t,
								page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid
							)
						)
						.map((t) => ({ label: $_(t), value: t }))
				]}
			>
				{#snippet icon()}
					<Plus />
				{/snippet}
			</DropDownMenu>
		{/if}
	{/if}
	<ul>
		{#each containers as container (container.guid)}
			<li>
				{#if item}
					{@render item(container)}
				{:else}
					<Card --height="100%" {container} />
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style>
	div {
		height: 100%;
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
		overflow-y: auto;
		padding: 3.5rem 5rem;
	}

	div :global(.dropdown-button.dropdown-button--menu) {
		--dropdown-button-active-background: var(--color-primary-900);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-default-background: var(--color-primary-700);
		--dropdown-button-default-color: white;
		--dropdown-button-hover-background: var(--color-primary-800);
		--dropdown-button-expanded-background: var(--color-primary-700);
		--dropdown-button-expanded-color: white;
		--dropdown-button-icon-size: 0.875rem;
		--dropdown-button-padding: 0.5rem 0.75rem;

		border: none;
		color: white;
		font-size: 0.75rem;
	}

	ul {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(19.5rem, 1fr));
	}

	ul:nth-child(2) {
		margin-top: 1.5rem;
	}
</style>
