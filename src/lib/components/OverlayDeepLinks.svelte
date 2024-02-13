<script lang="ts">
	import { Icon, QuestionMarkCircle } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import type { AnyContainer, PayloadType } from '$lib/models';

	export let container: AnyContainer;

	function helpURL(url: URL, payloadType: PayloadType) {
		const hashParams = paramsFromURL(url);
		hashParams.set('view-help', `${payloadType.replace('_', '-')}-view`);
		return `#${hashParams.toString()}`;
	}
</script>

<ul class="overlay-deep-links">
	<li>
		<a class="button" href={helpURL($page.url, container.payload.type)} title={$_('help')}>
			<Icon src={QuestionMarkCircle} size="20" mini />
		</a>
	</li>
</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.button {
		--padding-x: 12px;
		--padding-y: 12px;
	}
</style>
