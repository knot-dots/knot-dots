<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import StarSolid from '~icons/flowbite/star-solid';
	import Close from '~icons/knotdots/close';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import { uploadAsFormData } from '$lib/client/upload';
	import saveContainer from '$lib/client/saveContainer';
	import { ability, applicationState } from '$lib/stores';
	import transformFileURL from '$lib/transformFileURL';
	import type { OrganizationalUnitContainer, OrganizationContainer } from '$lib/models';

	interface Props {
		container: OrganizationContainer | OrganizationalUnitContainer;
		index: number;
	}

	let { container = $bindable(), index }: Props = $props();

	const popover = createPopover({ label: $_('favorite.edit') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'left-start',
		strategy: 'absolute'
	});

	const id = crypto.randomUUID();

	let uploadInProgress = $state(false);

	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;

		if (input.files instanceof FileList && input.files.length > 0) {
			try {
				uploadInProgress = true;
				container.payload.favorite[index].icon = await uploadAsFormData(input.files[0]);

				const response = await saveContainer(container);
				if (response.ok) {
					const updatedContainer = await response.json();
					container.revision = updatedContainer.revision;
				} else {
					const error = await response.json();
					alert(error.message);
				}
			} catch (e) {
				console.log(e);
			} finally {
				uploadInProgress = false;
			}
		}
	}

	function getFavoriteTitle() {
		return container.payload.favorite[index].title;
	}

	let timer: ReturnType<typeof setTimeout>;

	async function setFavoriteTitle(value: string) {
		container.payload.favorite[index].title = value;

		clearTimeout(timer);
		timer = setTimeout(async () => {
			const response = await saveContainer(container);
			if (response.ok) {
				const updatedContainer = await response.json();
				container.revision = updatedContainer.revision;
			} else {
				const error = await response.json();
				alert(error.message);
			}
		}, 2000);
	}
</script>

{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
	<div class="dropdown is-visible-on-hover" use:popperRef>
		<button class="dropdown-button" use:popover.button>
			<Ellipsis />
			<span class="is-visually-hidden">{$_('favorite.edit')}</span>
		</button>

		{#if $popover.expanded}
			<fieldset class="dropdown-panel" use:popperContent use:popover.panel>
				<div>
					<button class="action-button" onclick={popover.close}>
						<Close />
						<span class="is-visually-hidden">{$_('close')}</span>
					</button>

					<label class="title">
						<span>{$_('favorite.rename')}</span>
						<input bind:value={getFavoriteTitle, setFavoriteTitle} name="title" type="text" />
					</label>

					<label class="icon" for={id}>
						{#if uploadInProgress}
							<span class="loader" role="status"></span>
						{:else if container.payload.favorite[index].icon}
							<img
								alt=""
								class="logo"
								src={transformFileURL(container.payload.favorite[index].icon)}
							/>
						{:else}
							<StarSolid />
						{/if}
						{$_('favorite.change_icon')}
						<input
							accept="image/svg+xml"
							class="is-visually-hidden"
							{id}
							oninput={upload}
							type="file"
						/>
					</label>
				</div>
			</fieldset>
		{/if}
	</div>
{/if}

<style>
	.dropdown {
		--dropdown-button-border-radius: 8px;
		--dropdown-button-icon-size: 1rem;
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: transparent;
		--dropdown-button-padding: 0.25rem;
	}

	.dropdown-button {
		height: 100%;
	}

	.dropdown-panel {
		width: 14rem;
	}

	label {
		clear: right;
		display: block;
		padding: 0.5rem 0.75rem;
	}

	input[type='text'] {
		border-color: var(--color-gray-200);
		border-radius: 4px;
		color: var(--color-gray-500);
		line-height: 1.5;
		padding: 0.375rem;
	}

	img {
		height: 1.5rem;
		width: 1.5rem;
	}

	.action-button {
		float: right;
	}

	.icon {
		align-items: center;
		color: var(--color-gray-700);
		display: flex;
		gap: 0.625rem;
	}

	.icon > :global(svg) {
		color: var(--color-gray-500);
	}

	.title > span {
		color: var(--color-gray-400);
		font-size: 0.75rem;
	}

	.is-visible-on-hover {
		display: none;
	}
</style>
