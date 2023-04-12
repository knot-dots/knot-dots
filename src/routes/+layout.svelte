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
		navClass="px-2 md:px-4 py-2.5 absolute w-full z-20 top-0 left-0 border-b"
		fluid={true}
		let:hidden
		let:toggle
	>
		<NavBrand href="/">
			<img src={logo} class="mr-3 h-6 md:h-9" alt="Knot Dots logo" />
		</NavBrand>
		<div class="{hidden ? 'hidden md:block' : 'block'} order-1 md:order-0">
			<ButtonGroup>
				<Button>Strategies</Button>
				<Button>Objectives</Button>
				<Button>Measures</Button>
			</ButtonGroup>
		</div>

		<NavHamburger on:click={toggle} />

		<NavUl {hidden} divClass="w-full md:block md:w-auto order-3">
			<!-- <NavLi href="/" active={true}>Home</NavLi> -->
			<NavLi href="/about"><Button color="none" size="sm">Log in</Button></NavLi>
			<NavLi href="/services"><Button size="sm">Register</Button></NavLi>
		</NavUl>
	</Navbar>
	<div style="height:300px;" class="overflow-scroll pb-16">
		<slot />
	</div>
</div>
