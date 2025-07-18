# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

knot-dots is a SvelteKit web application for tracing administrative measures in sustainable communities. It's a complex full-stack application with authentication, database management, and multi-tenant architecture.

## Technology Stack

- **Frontend**: SvelteKit 2.x with TypeScript
- **Backend**: Node.js with SvelteKit API routes
- **Database**: PostgreSQL with Slonik query builder
- **Authentication**: Keycloak via @auth/sveltekit
- **Containerization**: Docker Compose for development
- **Testing**: Playwright for E2E tests
- **Build**: Vite

## Common Development Commands

### Development
```bash
# Start all services (app, database, keycloak)
docker compose up -d --build

# Visit the app
http://localhost:5173

# Access Keycloak admin
http://localhost:8080 (admin/admin)
```

### Database
```bash
# Create new migration
docker compose run --rm migrate create -ext sql MIGRATION_NAME

# Migrations are in migrate/sql/ with .up.sql and .down.sql files
```

### Testing
```bash
# Install Playwright dependencies
npx playwright install --with-deps

# Run E2E tests
npx playwright test

# Run unit tests
npm run test:unit
```

### Code Quality
```bash
# Type checking
npm run check

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Architecture

### Core Domain Model
The application is built around a flexible "Container" model (`app/src/lib/models.ts`):

- **Container**: Base entity with GUID, revision tracking, and JSON payload
- **Payload Types**: Different content types (goal, measure, indicator, organization, etc.)
- **Relations**: Typed relationships between containers (is-part-of, contributes-to, etc.)
- **User Relations**: Role-based access (admin, collaborator, member, etc.)

### Key Components

#### Database Layer (`app/src/lib/server/db.ts`)
- Uses Slonik for type-safe PostgreSQL queries
- Implements revision tracking for all entities
- Complex recursive queries for hierarchical data
- Schema validation with Zod

#### Authentication (`app/src/lib/authentication.ts`, `app/src/lib/authorization.ts`)
- Keycloak integration for SSO
- Role-based access control with @casl/ability
- Multi-tenant support with organization-level permissions

#### Client-Side State (`app/src/lib/stores.ts`)
- Svelte stores for global state management
- Overlay system for modal dialogs
- User session and ability management

#### API Routes (`app/src/routes/`)
- RESTful endpoints for container CRUD operations
- File upload handling
- Keycloak user management integration

### Data Flow
1. User requests are authenticated via Keycloak
2. Permissions are checked using CASL abilities
3. Database queries use Slonik with Zod validation
4. Results are filtered based on user permissions
5. Frontend updates via reactive Svelte stores

## Key Features

### Multi-Tenancy
- Organization-based isolation
- Organizational units for sub-grouping
- Hostname-based organization routing

### Hierarchical Data
- Containers can form complex hierarchies via relations
- Recursive queries for traversing relationships
- Position-based ordering for lists

### Revision Tracking
- All changes create new revisions
- Soft deletes with revision history
- Audit trail for all modifications

### File Management
- S3-compatible file storage
- PDF and image handling
- Upload via drag-and-drop interface

## Development Notes

### Database Schema
- Uses PostgreSQL with JSONB for flexible payload storage
- Migrations managed with golang-migrate
- Full-text search capabilities
- Extensive indexing for performance

### Component Structure
- Large number of Svelte components in `app/src/lib/components/`
- Editable components follow consistent naming pattern
- Overlay system for modal interactions

### Internationalization
- Uses svelte-i18n for localization
- Translation files in `app/src/lib/locales/`
- German and English support

### Performance Considerations
- Complex SQL queries with CTEs for hierarchical data
- Pagination and filtering at database level
- Efficient relationship loading patterns

## CSS and Frontend Styling

### Global CSS Architecture
- **Main stylesheet**: `app/src/app.css` - comprehensive global styles
- **CSS Custom Properties**: Extensive use of CSS variables for theming
- **PostCSS**: Minimal setup with autoprefixer in `postcss.config.js`
- **No CSS Framework**: Custom design system built from scratch

### CSS Custom Properties System
The application uses a sophisticated CSS custom properties system in `app.css`:

```css
:root {
  /* Color palette with numbered variants (050-900) */
  --color-gray-050: #f9fafb;
  --color-primary: #4dc3c5;
  --color-red: #ca1d61;
  
  /* Semantic colors for different states */
  --color-contributes-to: #7ad0ff;
  --color-is-consistent-with: #6edabe;
  
  /* Component-specific variables */
  --button-background: transparent;
  --form-control-background: var(--color-gray-050);
  --dropdown-button-padding: 0.375rem;
}
```

### Styling Patterns in Svelte Components

#### Component-Scoped Styles
- **Minimal inline styles**: Most components use scoped `<style>` blocks sparingly
- **Global class system**: Heavy reliance on utility classes from global CSS
- **CSS custom properties**: Components leverage global CSS variables for consistency

#### Style Organization
1. **Global Styles** (`app.css`):
   - CSS reset and base styles
   - Comprehensive button system with variants
   - Form controls and inputs
   - Layout utilities (flexbox, grid patterns)
   - Complex dropdown/menu systems
   - Badge and indicator components

2. **Component Styles** (within `.svelte` files):
   - Minimal scoped styles for specific layout needs
   - Mostly layout-specific properties (margins, positioning)
   - Component-specific overrides of global variables

#### Design System Components
- **Buttons**: Extensive button system with variants (primary, outline, alternative, ai, relation)
- **Form Controls**: Consistent styling for inputs, selects, textareas
- **Dropdowns**: Complex dropdown system with customizable styling via CSS variables
- **Cards**: Flexible card component with multiple display modes
- **Badges**: Color-coded badge system for different content types
- **Tables**: Custom table styling with hover effects and responsive design

### Development Guidelines for Styling
1. **Use Global Classes**: Prefer existing utility classes over component-specific styles
2. **CSS Variables**: Leverage the extensive custom property system for theming
3. **Minimal Scoped Styles**: Keep `<style>` blocks in components minimal and focused
4. **Design System**: Follow established patterns for buttons, forms, and layout components
5. **Responsive Design**: Use container queries and CSS Grid for responsive layouts

### Key CSS Features
- **Container Queries**: Modern responsive design with `@container` queries
- **CSS Logical Properties**: Modern CSS for internationalization
- **CSS Masking**: Used for fade-out overflow effects
- **CSS Transitions**: Smooth animations for interactive elements
- **Focus Management**: Comprehensive focus styles for accessibility

## Testing
- Playwright tests in `app/tests/`
- Tests run against production-like Docker environment
- Both desktop and mobile viewports tested