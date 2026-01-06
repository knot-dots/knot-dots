export default function requestSubmitElement(element: HTMLElement) {
	element.closest('form')?.requestSubmit();
}
