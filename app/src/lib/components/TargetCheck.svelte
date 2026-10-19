<script lang="ts">
	import { _ } from 'svelte-i18n';
	import tooltip from '$lib/attachments/tooltip';
	import type { ReviewStatus } from '$lib/reviewStatus';
	import { reviewStatusIcons } from '$lib/theme/models';

	interface Props {
		status: ReviewStatus;
	}

	let { status }: Props = $props();

	const Icon = $derived(reviewStatusIcons.get(status));
</script>

{#if Icon}
	<!-- The tooltip attachment provides aria-labelledby -->
	<span class="target-check" role="img" {@attach tooltip($_(status))}>
		<Icon aria-hidden="true" />
	</span>
{/if}

<style>
	.target-check {
		align-items: center;
		display: flex;
		height: 1.5rem;
		justify-content: center;
		width: 1.5rem;
	}

	.target-check :global(svg) {
		height: 1.25rem;
		width: 1.25rem;
	}
</style>
