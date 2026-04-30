import type { AnyContainer } from '$lib/models';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface Pagination {
	limit: number;
	offset: number;
}

export interface PaginatedLoadOptions {
	pagination?: Pagination;
}

export interface PageResult<T extends AnyContainer = AnyContainer> {
	containers: T[];
	hasMore: boolean;
}

export function queryLimit(options?: PaginatedLoadOptions) {
	return options?.pagination ? options.pagination.limit + 1 : undefined;
}

export function queryOffset(options?: PaginatedLoadOptions) {
	return options?.pagination?.offset;
}

export function applyPagination<T extends AnyContainer>(
	containers: T[],
	options?: PaginatedLoadOptions
): PageResult<T> {
	if (!options?.pagination) {
		return { containers, hasMore: false };
	}

	return {
		containers: containers.slice(0, options.pagination.limit),
		hasMore: containers.length > options.pagination.limit
	};
}
