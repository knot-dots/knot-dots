<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { source } from 'sveltekit-sse';
	import AskAI from '~icons/knotdots/ask-ai';
	import Check from '~icons/flowbite/check-outline';
	import Rotate from '~icons/flowbite/rotate-solid';
	import { page } from '$app/state';
	import { getToastContext } from '$lib/contexts/toast';
	import { paramsFromFragment, payloadTypes, type ProgramContainer } from '$lib/models';
	import { fetchContainersRelatedToProgram } from '$lib/remote/data.remote';
	import { ability } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: ProgramContainer;
	}

	let { container }: Props = $props();

	let isThinking = $state(false);

	let params = $derived({
		audience: paramsFromFragment(page.url).getAll('audience'),
		category: paramsFromFragment(page.url).getAll('category'),
		policyFieldBNK: paramsFromFragment(page.url).getAll('policyFieldBNK'),
		terms: paramsFromFragment(page.url).get('terms') ?? '',
		topic: paramsFromFragment(page.url).getAll('topic')
	});

	let toast = getToastContext();

	async function askAI(container: ProgramContainer) {
		isThinking = true;

		toast({
			icon: Rotate,
			heading: $_('toast.ai_job_started.heading'),
			message: $_('toast.ai_job_started.message'),
			status: 'info'
		});

		const stream = source('/ask-ai', {
			options: {
				body: new URLSearchParams([['program', container.guid]]),
				headers: { 'content-type': 'application/x-www-form-urlencoded' }
			}
		}).select('message');
		stream.subscribe((message) => {
			console.log(message);
			switch (message) {
				case 'error':
					isThinking = false;
					alert($_('ai_status.error'));
				case 'complete':
					isThinking = false;
					toast({
						icon: Check,
						heading: $_('toast.ai_job_completed.heading'),
						status: 'success'
					});
				default:
					fetchContainersRelatedToProgram({
						guid: container.guid,
						params
					}).refresh();
					break;
			}
		});
	}
</script>

{#if container.payload.pdf.length > 0 && $ability.can('create', payloadTypes.enum.undefined)}
	<button
		class="button-ai"
		class:is-active={isThinking}
		type="button"
		onclick={() => askAI(container as ProgramContainer)}
		aria-label={$_('ask_ai')}
		{@attach tooltip($_('ask_ai'))}
	>
		<AskAI />
		{$_('ask_ai')}
	</button>
{/if}
