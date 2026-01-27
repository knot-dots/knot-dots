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
	import { ability, applicationState } from '$lib/stores';

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

	async function extractKnowledgeObjects(container: ProgramContainer) {
		isThinking = true;

		toast({
			icon: Rotate,
			heading: $_('toast.ai_job_started.heading'),
			message: $_('toast.ai_job_started.message'),
			status: 'info'
		});

		const stream = source('/knowledge-ai', {
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
					break;
				case 'completed':
					isThinking = false;
					toast({
						icon: Check,
						heading: $_('toast.ai_job_completed.heading'),
						status: 'success'
					});
					break;
			}
			fetchContainersRelatedToProgram({
				guid: container.guid,
				params
			}).refresh();
		});
	}
</script>

{#if container.payload.pdf.length > 0 && $applicationState.containerDetailView.editable && $ability.can('create', payloadTypes.enum.knowledge)}
	<button
		class="button-ai"
		class:is-active={isThinking}
		type="button"
		onclick={() => extractKnowledgeObjects(container as ProgramContainer)}
	>
		<AskAI />
		{$_('knowledge_ai.label')}
	</button>
{/if}
