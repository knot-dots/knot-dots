<script>
	import { _ } from 'svelte-i18n';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
</script>

<div class="board">
	<BoardColumn title={$_('strategies')}><Card /><Card /><Card /></BoardColumn>
	<BoardColumn title={$_('topics')}><Card /><Card /><Card /></BoardColumn>
	<BoardColumn title={$_('models')}><Card /><Card /><Card /></BoardColumn>
	<BoardColumn title={$_('strategic_goals')}><Card /><Card /><Card /></BoardColumn>
	<BoardColumn title={$_('operational_goals')}><Card /><Card /><Card /></BoardColumn>
	<BoardColumn title={$_('measures')}><Card /><Card /><Card /></BoardColumn>
</div>

<style>
	.board {
		display: flex;
		gap: 1.5rem;
	}
</style>
