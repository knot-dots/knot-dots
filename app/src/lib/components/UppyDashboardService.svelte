<script lang="ts">
	import Dashboard from '@uppy/svelte/dashboard';
	import { uppyDashboard, closeDashboard } from '$lib/uppyStore';
	import '@uppy/core/css/style.min.css';
	import '@uppy/dashboard/css/style.min.css';
	import '@uppy/image-editor/css/style.min.css';

	let state = $derived($uppyDashboard);
	let dialogEl: HTMLDialogElement;

	$effect(() => {
		if (state.open && dialogEl) {
			if (!dialogEl.open) {
				dialogEl.showModal();
			}
		} else if (dialogEl && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleClose() {
		closeDashboard();
		if (state.props?.onRequestCloseModal) {
			state.props.onRequestCloseModal();
		}
	}
</script>

<dialog bind:this={dialogEl} class="uppy-service-dialog" onclose={handleClose}>
	{#if state.open && state.uppy}
		<Dashboard
			uppy={state.uppy}
			plugins={['ImageEditor']}
			props={{
				inline: true,
				width: '100%',
				height: '100%',
				...state.props
			}}
		/>
	{/if}
</dialog>

<style>
	.uppy-service-dialog {
		background: transparent;
		border: none;
		height: 80vh;
		max-height: 80vh;
		max-width: 100vw;
		outline: none;
		padding: 0;
		width: 80vw;
		top: 0;
	}

	.uppy-service-dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.5);
	}

	/* --- Dashboard Overrides --- */
	:global(.uppy-Dashboard) {
		height: 100% !important;
		width: 100% !important;
	}

	:global(.uppy-Dashboard-inner) {
		border-radius: 12px;
		box-shadow:
			0 20px 25px -5px rgb(0 0 0 / 0.1),
			0 8px 10px -6px rgb(0 0 0 / 0.1);
	}

	:global(.uppy-Container),
	:global(.uppy-Root) {
		height: 100% !important;
		width: 100% !important;
	}

	/* --- StatusBar (Bottom Bar) --- */
	:global(.uppy-StatusBar) {
		padding: 1rem;
		height: auto !important;
	}

	/* Move Upload Button to the Right */
	:global(.uppy-StatusBar-actions) {
		justify-content: flex-end !important;
		gap: 1rem;
		display: flex;
		flex-direction: row-reverse; /* Put Upload on the right, Cancel on the left */
	}

	/* Style Upload Button as primary blue */
	:global(.uppy-StatusBar-actionBtn--upload) {
		background-color: var(--color-primary-600) !important;
		color: white !important;
		border-radius: 6px !important;
		font-weight: 600 !important;
		padding: 0.75rem 1.5rem !important;
		font-size: 0.875rem !important;
		line-height: 1.25rem !important;
	}

	/* Style Cancel Button as an alternative button */
	:global(.uppy-StatusBar-actionBtn--cancel) {
		background-color: var(--color-gray-100) !important;
		color: var(--color-gray-700) !important;
		border-radius: 6px !important;
		font-weight: 500 !important;
		padding: 0.75rem 1rem !important;
		font-size: 0.875rem !important;
		border: 1px solid var(--color-gray-200) !important;
	}

	/* --- Edit Button Overrides --- */
	:global(.uppy-DashboardItem-actionWrapper) {
		width: auto !important;
		height: auto !important;
		overflow: visible !important;
	}

	:global(.uppy-DashboardItem-action--edit) {
		width: auto !important;
		height: auto !important;
		padding: 0.625rem 1rem !important;
		background-color: white !important;
		border: 1px solid var(--color-gray-200) !important;
		border-radius: 6px !important;
		display: flex !important;
		align-items: center !important;
		gap: 0.5rem !important;
		color: var(--color-gray-700) !important;
		box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
		transition: all 0.2s;
	}

	:global(.uppy-DashboardItem-action--edit:hover) {
		background-color: var(--color-gray-050) !important;
		border-color: var(--color-primary-300) !important;
		color: var(--color-primary-700) !important;
	}

	:global(.uppy-DashboardItem-action--edit::after) {
		content: 'Bild bearbeiten';
		font-size: 0.875rem;
		font-weight: 600;
	}

	:global(.uppy-DashboardItem-action--edit svg) {
		width: 1.125rem !important;
		height: 1.125rem !important;
	}

	/* Re-enable and style the header "Abbrechen" link as a button */
	:global(.uppy-DashboardContent-back) {
		background-color: var(--color-gray-100) !important;
		color: var(--color-gray-700) !important;
		border: 1px solid var(--color-gray-200) !important;
		border-radius: 6px !important;
		padding: 0.5rem 1rem !important;
		font-size: 0.875rem !important;
		font-weight: 500 !important;
		text-decoration: none !important;
		margin: 1rem !important;
		display: inline-flex !important;
		align-items: center !important;
		transition: all 0.2s;
	}

	:global(.uppy-DashboardContent-back:hover) {
		background-color: var(--color-gray-200) !important;
	}

	:global(.uppy-Dashboard-Item-action--edit) {
		width: auto !important;
		height: auto !important;
		align-items: start !important;
		justify-content: flex-start;
		color: var(--color-gray-700) !important;
		border-radius: 6px !important;
		border: 1px solid var(--color-gray-200) !important;
		background-color: white !important;
		padding: 0.5rem 1rem !important;
	}

	:global(.uppy-Dashboard-Item-action--edit:hover) {
		background-color: var(--color-gray-200) !important;
	}

	:global(.uppy-Dashboard-Item-action--edit::after) {
		content: 'Bild bearbeiten';
		font-size: 0.75rem;
		margin-left: 0.5rem;
	}

	:global(.uppy-Dashboard-Item-action--edit svg) {
		width: 1rem !important;
		height: 1rem !important;
	}
</style>
