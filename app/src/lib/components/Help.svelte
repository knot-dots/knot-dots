<script lang="ts">
	import { _ } from 'svelte-i18n';
	import QuestionCircle from '~icons/flowbite/question-circle-outline';
	import BookOutline from '~icons/flowbite/book-outline';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { type HelpSlug, overlayKey, paramsFromFragment } from '$lib/models';
	import { overlayHistory } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		slug: HelpSlug;
	}

	let { slug }: Props = $props();

	async function toggleHelp(url: URL) {
		let newParams = paramsFromFragment(url);
		if (newParams.get(overlayKey.enum['view-help']) === slug) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
			} else {
				newParams = new URLSearchParams();
			}
		} else {
			newParams.set(overlayKey.enum['view-help'], slug);
		}
		await goto(`#${newParams.toString()}`);
	}

	async function toggleKnowledge(url: URL) {
		let newParams = paramsFromFragment(url);
		if (newParams.has(overlayKey.enum['view-knowledge'])) {
			if ($overlayHistory.length > 1) {
				$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
				newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
			} else {
				newParams = new URLSearchParams();
			}
		} else {
			newParams.set(overlayKey.enum['view-knowledge'], '');
		}
		await goto(`#${newParams.toString()}`);
	}
</script>

<aside>
	<button onclick={() => toggleHelp(page.url)} type="button" {@attach tooltip($_('help'))}>
		<QuestionCircle />
	</button>
	<button
		onclick={() => toggleKnowledge(page.url)}
		type="button"
		{@attach tooltip($_('knowledge'))}
	>
		<BookOutline />
	</button>
</aside>

<style>
	aside {
		align-items: flex-end;
		background-color: var(--color-orange-050);
		border-bottom: solid 1px var(--color-orange-200);
		border-left: solid 1px var(--color-orange-200);
		border-top: solid 1px var(--color-orange-200);
		border-bottom-left-radius: 12px;
		border-top-left-radius: 12px;
		bottom: 0;
		box-shadow: var(--shadow-sm);
		color: var(--color-orange-600);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		height: fit-content;
		justify-content: center;
		margin: auto 0;
		padding: 0.5rem;
		position: absolute;
		right: 0;
		top: 0;
		z-index: 2;
	}

	button {
		--button-active-background: transparent;
		--button-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0;
		--padding-y: 0;

		border: none;
		cursor: pointer;
		display: block;
		height: 2rem;
		padding: 0 0.5rem;
	}
</style>
