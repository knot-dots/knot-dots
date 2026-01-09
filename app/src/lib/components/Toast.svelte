<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/knotdots/close';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		icon?: Component<SvelteHTMLElements['svg']>;
		heading: string;
		message?: string;
		onclose: () => void;
		status: 'error' | 'info' | 'success' | 'warning';
	}

	let { icon: Icon, heading, message, onclose, status }: Props = $props();
</script>

<div class="toast" role="status">
	<button
		class="action-button action-button--size-s"
		onclick={onclose}
		type="button"
		{@attach tooltip($_('cancel'))}
	>
		<Close />
	</button>

	{#if Icon}
		<div class="toast-icon toast-icon--{status}">
			<Icon />
		</div>
	{/if}

	<div class="toast-content">
		<p class="toast-heading">{heading}</p>

		{#if message}
			<p class="toast-message">{message}</p>
		{/if}
	</div>
</div>

<style>
	.toast {
		align-items: flex-start;
		background: white;
		border: solid 1px var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-xl);
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		position: relative;
	}

	.toast-heading {
		color: var(--color-gray-900);
		font-weight: 600;
	}

	.toast-message {
		color: var(--color-gray-600);
		font-size: 0.75rem;
	}

	.toast-icon {
		border-radius: 8px;
		flex-shrink: 0;
		padding: 0.375rem;
	}

	.toast-icon--info {
		background-color: var(--color-primary-100);
		color: var(--color-primary-600);
	}

	.toast-icon--success {
		background-color: var(--color-green-100);
		color: var(--color-green-600);
	}

	.toast button {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
	}
</style>
