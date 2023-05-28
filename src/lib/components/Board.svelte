<div class="board">
	<slot />
</div>

<style>
	.board {
		display: flex;
		flex: 1 1;
		gap: 1.5rem;
		height: calc(100% - 2rem);
		margin: 1rem;
		overflow: scroll;
	}
</style>
