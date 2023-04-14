<script>
	import '../app.css';
	import {
		ButtonGroup,
		Button,
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger,
		Sidebar,
		SidebarGroup,
		SidebarItem,
		SidebarWrapper
	} from 'flowbite-svelte';
	import logo from '$lib/assets/logo.png';
	import ChevronButton from '$lib/ChevronButton.svelte';
	import ViewBoardsButton from '$lib/ViewBoardsButton.svelte';
	import MapButton from '$lib/MapButton.svelte';
	import TableButton from '$lib/TableButton.svelte';
	import FilterIcon from '$lib/FilterIcon.svelte';
	import SortDescendingIcon from '$lib/SortDescendingIcon.svelte';
	import QuestionMarkCircleIcon from '$lib/QuestionMarkCircleIcon.svelte';
	import UserGroupIcon from '$lib/UserGroupIcon.svelte';

	let sidebarExpanded = true;
	$: spanClass = `flex-1 ml-3 whitespace-nowrap ${sidebarExpanded ? '' : 'hidden'}`;
	function toggleSidebar() {
		sidebarExpanded = !sidebarExpanded;
	}
</script>

<Navbar
	navClass="px-2 md:px-4 py-2.5 md:py-0 absolute w-full z-20 top-0 left-0 border-b"
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
<div class="flex mt-[56px] md:mt-[68px] ">
	<Sidebar asideClass="{sidebarExpanded ? 'w-60' : 'w-[68px]'} flex-none">
		<SidebarWrapper>
			<SidebarGroup>
				{#if sidebarExpanded}
					<ViewBoardsButton />
					<MapButton />
					<TableButton />
				{/if}

				<span class:float-right={sidebarExpanded}>
					<ChevronButton {sidebarExpanded} on:click={toggleSidebar} />
				</span>
			</SidebarGroup>
			<SidebarGroup border>
				<SidebarItem label="Filter" {spanClass}>
					<svelte:fragment slot="icon">
						<FilterIcon svgClass={sidebarExpanded ? '' : 'mx-auto'} />
					</svelte:fragment>
				</SidebarItem>
				<SidebarItem label="Sort" {spanClass}>
					<svelte:fragment slot="icon">
						<SortDescendingIcon svgClass={sidebarExpanded ? '' : 'mx-auto'} />
					</svelte:fragment>
				</SidebarItem>
			</SidebarGroup>
			<SidebarGroup border>
				<SidebarItem label="Help" spanClass="{spanClass} text-gray-500">
					<svelte:fragment slot="icon">
						<QuestionMarkCircleIcon svgClass="{sidebarExpanded ? '' : 'mx-auto'} fill-gray-500" />
					</svelte:fragment>
				</SidebarItem>
				<SidebarItem label="About us" spanClass="{spanClass} text-gray-500">
					<svelte:fragment slot="icon">
						<UserGroupIcon svgClass="{sidebarExpanded ? '' : 'mx-auto'} fill-gray-500" />
					</svelte:fragment>
				</SidebarItem>
			</SidebarGroup>
		</SidebarWrapper>
	</Sidebar>
	<main class="p-16 grow">
		<slot />
	</main>
</div>
