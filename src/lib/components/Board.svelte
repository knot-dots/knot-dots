<div class="board">
	<slot />
</div>

<style>
	.board {
		display: flex;
		flex: 1 1;
		gap: 0.75rem;
		height: calc(100% - 2rem);
		margin: 0.75rem 0.375rem;
		overflow: scroll;
	}
</style>
