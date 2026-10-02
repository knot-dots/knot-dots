<!-- Two dots whose connecting thread has come undone: a loose knot. -->
<svg aria-hidden="true" focusable="false" viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
	<circle class="background" cx="100" cy="70" r="66" />
	<path class="thread" d="M50 92 C 62 62, 82 50, 90 64 C 96 75, 84 82, 80 72" />
	<path class="thread" d="M150 48 C 138 78, 118 90, 110 76 C 104 65, 116 58, 120 68" />
	<circle class="loose" cx="100" cy="34" r="3" />
	<circle class="loose" cx="100" cy="106" r="3" />
	<circle class="dot dot--start" cx="46" cy="96" r="13" />
	<circle class="dot dot--end" cx="154" cy="44" r="13" />
</svg>

<style>
	svg {
		display: block;
		height: auto;
		width: 100%;
	}

	.background {
		fill: var(--color-primary-050);
	}

	.thread {
		fill: none;
		stroke: var(--color-primary-300);
		stroke-linecap: round;
		stroke-width: 4;
	}

	.loose {
		fill: var(--color-primary-300);
	}

	.dot--start {
		fill: var(--color-primary-600);
	}

	.dot--end {
		fill: var(--color-primary-400);
	}
</style>
