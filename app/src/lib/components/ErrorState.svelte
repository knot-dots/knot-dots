<script lang="ts">
	import { type Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import ErrorIllustration from '$lib/components/ErrorIllustration.svelte';

	interface Props {
		actions: Snippet;
		code?: number | string;
		description: string;
		title: string;
		visual?: Snippet;
	}

	let { actions, code, description, title, visual }: Props = $props();
</script>

<section class="error-state">
	<div class="error-state-visual">
		{#if visual}
			{@render visual()}
		{:else}
			<ErrorIllustration />
		{/if}
	</div>

	<!--
		SvelteKit moves the focus to [autofocus] after client-side navigation and browsers do so on
		the initial load, so screen readers announce the heading first.
	-->
	<!-- svelte-ignore a11y_autofocus -->
	<h1 autofocus tabindex="-1">{title}</h1>

	<p>{description}</p>

	<div class="error-state-actions system-primary">
		{@render actions()}
	</div>

	{#if code}
		<p class="error-state-code">{$_('error.page.code', { values: { code } })}</p>
	{/if}
</section>

<style>
	.error-state {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: auto;
		max-width: 32rem;
		padding: 3rem 1rem;
		text-align: center;
		width: 100%;
	}

	.error-state-visual {
		margin-bottom: 0.5rem;
		width: clamp(8rem, 40vw, 12rem);
	}

	h1 {
		color: var(--color-text-strong);
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.25;
	}

	h1:focus {
		outline: none;
	}

	p {
		color: var(--color-text-default);
	}

	.error-state-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.error-state-code {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
	}

	@media (max-width: 30rem) {
		.error-state-actions {
			align-self: stretch;
			flex-direction: column;
		}
	}
</style>
