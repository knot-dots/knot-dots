<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import saveContainer from '$lib/client/saveContainer';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import { type AnyContainer, type ContainerWithSummary, type SummaryContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	interface Props {
		container: SummaryContainer;
		editable?: boolean;
		parentContainer: ContainerWithSummary;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	const id = crypto.randomUUID();

	let timer: ReturnType<typeof setTimeout>;

	async function handleInput(event: Event) {
		event.stopPropagation();
		clearTimeout(timer);
		timer = setTimeout(async () => {
			const response = await saveContainer(parentContainer);
			if (response.ok) {
				const updatedContainer = await response.json();
				parentContainer.revision = updatedContainer.revision;
				await invalidate('containers');
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}, 2000);
	}

	async function handleDelete() {
		parentContainer.payload.summary = undefined;

		const response = await saveContainer(parentContainer);
		if (response.ok) {
			const updatedContainer = await response.json();
			parentContainer.revision = updatedContainer.revision;
			await invalidate('containers');
		} else {
			const error = await response.json();
			alert(error.message);
		}
	}
</script>

<header>
	{#if editable}
		{#if $ability.can('update', parentContainer)}
			<label class="badge badge--purple" for={id}>
				{$_('summary')}
			</label>
			<ul class="inline-actions is-visible-on-hover">
				<li>
					<ContainerSettingsDropdown
						bind:container
						bind:parentContainer
						bind:relatedContainers
						ondelete={handleDelete}
					/>
				</li>
			</ul>
		{/if}
	{:else}
		<span class="badge badge--purple">{$_('summary')}</span>
	{/if}
</header>

{#if editable && $ability.can('update', parentContainer)}
	<AutoresizingTextarea
		bind:value={parentContainer.payload.summary}
		{id}
		maxlength={200}
		name="summary"
		oninput={handleInput}
		placeholder={$_('empty')}
		rows={1}
	/>
{:else}
	<Summary container={parentContainer} />
{/if}

<style>
	label,
	span {
		font-weight: 400;
		margin: 0.375rem 0 1rem 0;
	}
</style>
