<script lang="ts">
	import type { resource } from 'runed';
	import { _ } from 'svelte-i18n';
	import { source } from 'sveltekit-sse';
	import AskAI from '~icons/knotdots/ask-ai';
	import Check from '~icons/flowbite/check-outline';
	import Rotate from '~icons/flowbite/rotate-solid';
	import { getToastContext } from '$lib/contexts/toast';
	import { type Container, containerOfType, payloadTypes, type ProgramPayload } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<ProgramPayload>;
		relatedContainersQuery: ReturnType<typeof resource>;
	}

	let { container, relatedContainersQuery }: Props = $props();

	let isThinking = $state(false);

	let toast = getToastContext();

	async function extractKnowledgeObjects(container: Container<ProgramPayload>) {
		isThinking = true;

		toast({
			icon: Rotate,
			heading: $_('toast.ai_job_started.heading'),
			message: $_('toast.ai_job_started.message'),
			status: 'info'
		});

		const stream = source('/knowledge-ai', {
			body: new URLSearchParams([['program', container.guid]]),
			headers: { 'content-type': 'application/x-www-form-urlencoded' }
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
			relatedContainersQuery.refetch();
		});
	}
</script>

{#if container.payload.pdf.length > 0 && $applicationState.containerDetailView.editable && $ability.can('create', containerOfType(payloadTypes.enum.knowledge, container))}
	<button
		class="button-ai"
		class:is-active={isThinking}
		type="button"
		onclick={() => extractKnowledgeObjects(container as Container<ProgramPayload>)}
	>
		<AskAI />
		{$_('knowledge_ai.label')}
	</button>
{/if}
