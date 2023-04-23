<script lang="ts">
	import { _ } from 'svelte-i18n';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import { containerTypes } from '$lib/models.js';
</script>

<div class="board">
	<BoardColumn title={$_('strategies')} containerType={containerTypes.enum.strategy}>
		<Card /><Card /><Card />
	</BoardColumn>
	<BoardColumn title={$_('topics')} containerType={containerTypes.enum.topic}>
		<Card /><Card /><Card />
	</BoardColumn>
	<BoardColumn title={$_('models')} containerType={containerTypes.enum.model}>
		<Card /><Card /><Card />
	</BoardColumn>
	<BoardColumn title={$_('strategic_goals')} containerType={containerTypes.enum.strategic_goal}>
		<Card /><Card /><Card />
	</BoardColumn>
	<BoardColumn title={$_('operational_goals')} containerType={containerTypes.enum.operational_goal}>
		<Card /><Card /><Card />
	</BoardColumn>
	<BoardColumn title={$_('measures')} containerType={containerTypes.enum.measure}>
		<Card /><Card /><Card />
	</BoardColumn>
</div>

<style>
	.board {
		display: flex;
		gap: 1.5rem;
	}
</style>
