<script>
	import '../app.css';
	import {
		ButtonGroup,
		Button,
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger
	} from 'flowbite-svelte';
	import logo from '$lib/assets/logo.png';
</script>

<div class="relative px-8">
	<Navbar
		navClass="px-2 s:px-4 py-2.5 absolute w-full z-20 top-0 left-0 border-b"
		let:hidden
		let:toggle
	>
		<NavBrand href="/">
			<img src={logo} class="mr-3 h-6 s:h-9" alt="Knot Dots logo" />
		</NavBrand>
		<NavHamburger on:click={toggle} />
		<ButtonGroup>
			<Button>Strategies</Button>
			<Button>Objectives</Button>
			<Button>Measures</Button>
		</ButtonGroup>

		<NavUl {hidden}>
			<!-- <NavLi href="/" active={true}>Home</NavLi> -->
			<NavLi href="/about"><Button color="alternative" size="sm">Log in</Button></NavLi>
			<NavLi href="/services"><Button size="sm">Register</Button></NavLi>
		</NavUl>
	</Navbar>
	<div style="height:300px;" class="overflow-scroll pb-16">
		<slot />
	</div>
</div>
