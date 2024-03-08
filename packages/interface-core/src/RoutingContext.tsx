import { type Router } from '@remix-run/router';
import { createContext, useContext } from 'react';
import { type RouteObject } from 'react-router-dom';

export const RoutingContext = createContext<{
	visible: boolean;
	currentIndex: number;
	tabId: string;
	maxIndex: number;
	routes: Array<RouteObject>;
} | null>(null);

// We split this into a different context because we don't want to trigger the hook unnecessarily
export const RouterContext = createContext<Router | null>(null);

export function useRoutingContext() {
	const ctx = useContext(RoutingContext);

	if (!ctx) throw new Error('useRoutingContext must be used within a RoutingContext.Provider');

	return ctx;
}

export function useRouter() {
	const ctx = useContext(RouterContext);
	if (!ctx) throw new Error('useRouter must be used within a RouterContext.Provider');

	return ctx;
}
