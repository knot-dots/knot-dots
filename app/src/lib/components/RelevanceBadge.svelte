<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import { relevanceLevel } from '$lib/models';

	interface Props {
		score: number;
	}

	let { score }: Props = $props();

	let level = $derived(relevanceLevel(score));
</script>

<span class="badge badge--{level.color}" title={$_('create_effect_dialog.relevance')}>
	<span class="is-visually-hidden">{$_('create_effect_dialog.relevance')}</span>
	{$number(level.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
</span>
