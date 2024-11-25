export default function requestSubmit(event: Event) {
	(event.currentTarget as HTMLElement).closest('form')?.requestSubmit();
}
