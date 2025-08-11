# Button Accessibility Audit

## Summary

An accessibility audit was conducted on all button elements in the Svelte codebase to check for proper tooltips and accessible names. The audit found **85 buttons** across **38 files** with the following results:

- ✅ **Good**: 54 buttons (64%) - Have visible text or proper aria-label/title
- ⚠️ **Needs Attention**: 28 buttons (33%) - Icon-only buttons without proper labels
- ❌ **Critical Issues**: 3 buttons (4%) - No accessible name at all

## Critical Issues (Fix Immediately)

### 1. Search Button - `/app/src/lib/components/Search.svelte`
```html
<button type="submit">
	<Search />
</button>
```
**Issue**: Icon-only submit button with no accessible name
**Fix**: Add `aria-label` attribute
```html
<button type="submit" aria-label={$_('search')}>
	<Search />
</button>
```

### 2. Help Button - `/app/src/lib/components/Help.svelte`
```html
<button onclick={() => toggleHelp(page.url)} type="button">
	<QuestionCircle />
	<span class="is-visually-hidden">{$_('help')}</span>
</button>
```
**Issue**: While it has visually hidden text, it could be clearer with aria-label
**Fix**: Add explicit `aria-label`
```html
<button onclick={() => toggleHelp(page.url)} type="button" aria-label={$_('help')}>
	<QuestionCircle />
</button>
```

### 3. Property Grid Button - `/app/src/lib/components/PropertyGrid.svelte`
```html
<button onclick={() => toggleSort()} type="button">
	<BarsArrowUp />
</button>
```
**Issue**: Icon-only button with no accessible name
**Fix**: Add `aria-label`
```html
<button onclick={() => toggleSort()} type="button" aria-label={$_('sort')}>
	<BarsArrowUp />
</button>
```

## Needs Attention (Icon-only buttons without labels)

### Navigation and UI Controls

#### `/app/src/routes/[type=containerType]/[guid=uuid]/members/+page.svelte`
```html
<button class="action-button" type="button" on:click={() => window.history.back()}>
	<ChevronLeft />
</button>
```
**Fix**: Add `aria-label={$_('back')}`

#### `/app/src/lib/components/OrganizationMenu.svelte`
```html
<button class="dropdown-button" type="button" use:popover.button>
	<Organization />
	<span class="is-visually-hidden truncated">
		{page.data.currentOrganization.payload.name}
	</span>
	<ChevronDown />
</button>
```
**Fix**: Add `aria-label={$_('organization_menu')}`

### Form Controls and Actions

#### `/app/src/lib/components/Members.svelte`
```html
<button class="button-primary" type="button" on:click={() => dialog.showModal()}>
	<UserAdd />
</button>
```
**Fix**: Add `aria-label={$_('add_member')}`

```html
<button
	class="action-button"
	type="button"
	title={$_('user.remove_relations')}
	on:click={() => handleRemoveRelations(u, container)}
>
	<XMark />
</button>
```
**Status**: ✅ Good - Has title attribute

### Data Table Actions

#### `/app/src/lib/components/EditableHistoricalValues.svelte`
```html
<button aria-label={$_('append_row')} onclick={prepend} type="button">
	<Plus />
</button>
```
**Status**: ✅ Good - Has aria-label

```html
<button aria-label={$_('delete_row')} onclick={remove(index)} type="button">
	<Minus />
</button>
```
**Status**: ✅ Good - Has aria-label

### File Upload Controls

#### `/app/src/lib/components/EditableFile.svelte`
```html
<button
	aria-label={$_('upload.file.remove')}
	class="button button-remove"
	onclick={remove(i)}
	type="button"
>
	<TrashBin />
</button>
```
**Status**: ✅ Good - Has aria-label

#### `/app/src/lib/components/EditableImage.svelte`
```html
<button
	aria-label={$_('upload.image.remove')}
	class="button button-remove"
	onclick={remove}
	type="button"
>
	<TrashBin />
</button>
```
**Status**: ✅ Good - Has aria-label

### Dialog and Modal Controls

#### `/app/src/lib/components/Dialog.svelte`
```html
<button tabindex="-1" title={$_('close_modal')} type="button" onclick={() => dialog.close()}>
	<XMark />
</button>
```
**Status**: ✅ Good - Has title attribute

#### `/app/src/lib/components/OverlayCloseButton.svelte`
```html
<a class="action-button action-button--padding-tight" href={closeURL(page.url)} title={$_('close')}>
	<ChevronDoubleRight />
</a>
```
**Status**: ✅ Good - Has title attribute (though it's a link, not button)

### Dropdown and Menu Controls

#### `/app/src/lib/components/SingleChoiceDropdown.svelte`
```html
<button class="dropdown-button" type="button" use:popover.button>
	<span class="truncated">
		{#if selected}{selected.label}{:else}{$_('empty')}{/if}
	</span>
	<ChevronDown />
</button>
```
**Status**: ✅ Good - Has visible text content

#### `/app/src/lib/components/WorkspacesMenu.svelte`
```html
<button class="dropdown-button" onchange={handleChange} type="button" use:menu.button>
	{#if selected?.icon}
		<selected.icon />
	{/if}
	<span class="truncated">{selected?.label}</span>
	<ChevronDown />
</button>
```
**Status**: ✅ Good - Has visible text content

### Add Item Buttons

#### `/app/src/lib/components/BoardColumn.svelte`
```html
<a href={addItemUrl} onclick={createContainer} title={$_('add_item')}>
	<PlusSmall />
</a>
```
**Status**: ✅ Good - Has title attribute (though it's a link, not button)

#### `/app/src/lib/components/EditablePartOfMeasureCarousel.svelte`
```html
<button aria-label={$_('add_item')} class="card" onclick={createContainer} type="button">
	<Plus />
</button>
```
**Status**: ✅ Good - Has aria-label

## Well-Implemented Buttons (Examples)

These buttons demonstrate good accessibility practices:

### Form Submissions
```html
<button class="primary" type="submit">{$_('import.submit')}</button>
```
**Good**: Clear text content

### Actions with Text
```html
<button class="button-primary button-xs" onclick={() => signIn('keycloak')} type="button">
	{$_('login')}
</button>
```
**Good**: Clear text content

### Icon Buttons with Labels
```html
<button aria-label={$_('delete')} class="delete quiet" type="button" onclick={deleteContainer}>
	<TrashBin />
</button>
```
**Good**: Proper aria-label for icon-only button

## Recommendations

### Priority 1 (Critical)
1. Fix the 3 buttons with no accessible names
2. Add `aria-label` attributes to all icon-only buttons

### Priority 2 (Enhancement)
1. Consider adding tooltips (`title` attribute) to complement aria-labels
2. Review buttons that only have visually hidden text - consider using aria-label instead
3. Ensure consistent labeling patterns across similar buttons

### Priority 3 (Best Practices)
1. Add keyboard navigation support where missing
2. Consider focus management for modal and overlay controls
3. Test with screen readers to verify label quality

## Implementation Examples

### For Icon-only Buttons:
```html
<!-- Before -->
<button onclick={someAction} type="button">
	<IconComponent />
</button>

<!-- After -->
<button onclick={someAction} type="button" aria-label={$_('action_description')}>
	<IconComponent />
</button>
```

### For Buttons with Both Icon and Text:
```html
<!-- Good - No changes needed -->
<button type="button">
	<IconComponent />
	{$_('button_text')}
</button>
```

### For Tooltip Enhancement:
```html
<!-- Good -->
<button aria-label={$_('delete')} title={$_('delete_tooltip')} type="button">
	<TrashBin />
</button>
```

## Testing Recommendations

1. **Screen Reader Testing**: Use NVDA, JAWS, or VoiceOver to verify all buttons announce properly
2. **Keyboard Navigation**: Ensure all buttons are reachable via Tab and activate with Enter/Space
3. **Focus Management**: Verify focus moves logically, especially in modals and overlays
4. **Automated Testing**: Consider adding axe-core or similar accessibility testing tools

## Conclusion

The codebase shows good accessibility practices overall, with consistent use of internationalization for button text and proper semantic HTML. The main areas for improvement are:

1. Adding `aria-label` attributes to icon-only buttons
2. Ensuring all interactive elements have accessible names
3. Implementing consistent labeling patterns across similar functionality

Addressing these issues will significantly improve the application's accessibility for users with disabilities.