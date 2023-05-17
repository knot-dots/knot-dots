<div class="board">
	<slot />
</div>

<style>
	.board {
		display: flex;
		flex-grow: 1;
		gap: 1.5rem;
		height: 100%;
		overflow: scroll;
	}
</style>
