<script lang="ts">
	import { flip } from 'svelte/animate';
	import { type DndEvent, dragHandle, dragHandleZone } from 'svelte-dnd-action';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Chapter from '~icons/knotdots/chapter';
	import DragHandle from '~icons/knotdots/draghandle';
	import TocIcon from '~icons/knotdots/toc-menu';
	import { type AnyPayload, type Container, isChapterContainer, predicates } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
		handleSort: (sections: Container[]) => Promise<void>;
		sections: Container[];
	}

	interface TableOfContentsNode {
		guid: string;
		level: number;
		section: Container;
		children: TableOfContentsNode[];
	}

	let { container, handleSort, sections }: Props = $props();

	const disclosure = createDisclosure();

	const [popperRef, popperContent] = createPopperActions({
		placement: 'left-start',
		strategy: 'absolute'
	});

	const extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset: [0, 6] } }]
	});

	function level(section: Container, position: number) {
		if (isChapterContainer(section)) {
			return section.payload.number.split('.').length;
		} else {
			const chapter = sections.slice(0, position).reverse().find(isChapterContainer);
			return Math.min((chapter?.payload.number.split('.').length ?? 0) + 1, 6);
		}
	}

	let tree = $derived.by(() => {
		const roots: TableOfContentsNode[] = [];
		const stack: { node: TableOfContentsNode; level: number }[] = [];

		sections.forEach((section, position) => {
			const currentLevel = level(section, position);
			const node: TableOfContentsNode = $state(
				$state.snapshot({ guid: section.guid, level: currentLevel, section, children: [] })
			);

			while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel) {
				stack.pop();
			}

			if (stack.length === 0) {
				roots.push(node);
			} else {
				stack[stack.length - 1].node.children.push(node);
			}

			stack.push({ node, level: currentLevel });
		});

		return roots;
	});

	function flatten(nodes: TableOfContentsNode[]): Container[] {
		return nodes.flatMap((node) => [node.section, ...flatten(node.children)]);
	}

	function handleConsider(parentNode?: TableOfContentsNode) {
		return async (event: CustomEvent<DndEvent<TableOfContentsNode>>) => {
			const { items: newItems } = event.detail;
			if (parentNode) {
				parentNode.children = newItems;
			} else {
				tree = newItems;
			}
		};
	}

	async function handleFinalize() {
		const orderedSections = flatten(tree).map((s, i) => ({
			...s,
			relation: [
				{
					object: container.guid,
					position: i,
					predicate: predicates.enum['is-section-of'],
					subject: s.guid
				},
				...s.relation.filter(({ predicate }) => predicate !== predicates.enum['is-section-of'])
			]
		}));

		await handleSort(orderedSections);
	}
</script>

{#snippet tableOfContents(nodes: TableOfContentsNode[], parentNode?: TableOfContentsNode)}
	<ol
		class="table-of-contents"
		onconsider={handleConsider(parentNode)}
		onfinalize={handleFinalize}
		use:dragHandleZone={{
			flipDurationMs: 100,
			items: nodes,
			dropTargetStyle: {}
		}}
	>
		{#each nodes as node (node.guid)}
			<li animate:flip={{ duration: 100 }}>
				<div class="table-of-contents-entry">
					{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
						<span class="drag-handle" use:dragHandle>
							<DragHandle />
						</span>
					{:else}
						<Chapter />
					{/if}
					<a
						href={`javascript:document.getElementById('section-${node.section.guid}').scrollIntoView({behavior: 'smooth'});`}
						class="truncated"
					>
						{node.section.payload.title}
					</a>
				</div>
				{#if node.children.length > 0}
					{@render tableOfContents(node.children, node)}
				{/if}
			</li>
		{/each}
	</ol>
{/snippet}

{#if tree.length > 0}
	<div class="dropdown" use:popperRef>
		<button class="action-button" use:disclosure.button>
			<TocIcon />
			<span class="is-visually-hidden">{$_('table_of_contents')}</span>
		</button>

		{#if $disclosure.expanded}
			<div class="dropdown-panel" use:disclosure.panel use:popperContent={extraOpts}>
				<h3 class="dropdown-panel-title">{$_('table_of_contents')}</h3>
				{@render tableOfContents(tree)}
			</div>
		{/if}
	</div>
{/if}

<style>
	.dropdown {
		background:
			linear-gradient(205deg, rgba(255, 255, 255, 0.75) 1.32%, rgba(255, 255, 255, 0) 97.79%),
			var(--color-background-accent-muted);
		border: solid 1px var(--color-border-accent-subtle);
		border-radius: 12px;
		margin: 0.25rem;
		padding: 0.25rem;
		position: absolute;
		right: -3.125rem;
		top: 5rem;
		z-index: 2;
	}

	.dropdown-panel {
		--dropdown-panel-max-height: 30rem;
		--dropdown-panel-max-width: 20rem;

		background: var(--color-surface-container);
		border: 1px solid var(--color-border-raised);
		border-radius: 12px;
		box-shadow: var(--shadow-lg);
		display: block;
		padding: 0.25rem;
	}

	.dropdown-panel-title {
		color: var(--color-text-strong);
		font-size: 12px;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		white-space: nowrap;
	}

	ol {
		margin-top: 0.25rem;
	}

	ol ol,
	:global(#dnd-action-dragged-el ol) {
		border-left: 2px solid var(--color-border-subtle);
		margin-left: 0.25rem;
		padding-left: 0.5rem;
	}

	li {
		color: var(--color-text-default);
		margin: 0.5rem 0.25rem;
	}

	.table-of-contents-entry {
		align-items: center;
		display: flex;
		gap: 0.25rem;
	}

	.table-of-contents-entry > :global(:first-child) {
		color: var(--color-icon-accent-muted);
		flex-shrink: 0;
	}

	.table-of-contents-entry > .truncated {
		min-width: 0;
	}

	.table-of-contents-entry :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.drag-handle {
		color: var(--color-icon-default);
	}
</style>
