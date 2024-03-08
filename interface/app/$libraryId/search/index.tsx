import {
	createDefaultExplorerSettings,
	EmptyNotice,
	Explorer,
	ExplorerContextProvider,
	objectOrderingKeysSchema,
	UseExplorerSettings,
	useExplorerSettings,
	useObjectsExplorerQuery
} from '@sd/explorer';
import { Icon, useRouteTitle } from '@sd/interface-core';
import { useEffect, useMemo } from 'react';
import { useSearchParams as useRawSearchParams } from 'react-router-dom';
import { ObjectKindEnum, ObjectOrder } from '@sd/client';

import { SearchContextProvider, SearchOptions, useSearch } from '.';
import { DefaultTopBarOptions } from '../Layout/TopBarOptions';
import { TopBarPortal } from '../TopBar/Portal';
import { useLibraryExplorer } from '../useLibraryExplorer';
import SearchBar from './SearchBar';

export * from './context';
export * from './SearchOptions';
export * from './useSearch';

export function Component() {
	useRouteTitle('Search');

	const explorerSettings = useExplorerSettings({
		settings: useMemo(() => {
			return createDefaultExplorerSettings<ObjectOrder>({ order: null });
		}, []),
		orderingKeys: objectOrderingKeysSchema
	});

	const search = useSearchWithFilters(explorerSettings);

	const objects = useObjectsExplorerQuery({
		arg: {
			take: 100,
			filters: search.allFilters
		},
		explorerSettings
	});

	const explorer = useLibraryExplorer({
		...objects,
		isFetchingNextPage: objects.query.isFetchingNextPage,
		settings: explorerSettings
	});

	return (
		<ExplorerContextProvider explorer={explorer}>
			<SearchContextProvider search={search}>
				<TopBarPortal
					center={<SearchBar />}
					left={
						<div className="flex flex-row items-center gap-2">
							<span className="truncate text-sm font-medium">Search</span>
						</div>
					}
					right={<DefaultTopBarOptions />}
				>
					{search.open && (
						<>
							<hr className="w-full border-t border-sidebar-divider bg-sidebar-divider" />
							<SearchOptions />
						</>
					)}
				</TopBarPortal>
			</SearchContextProvider>

			<Explorer
				emptyNotice={
					<EmptyNotice
						icon={<Icon name="Search" size={128} />}
						message="No items found"
					/>
				}
			/>
		</ExplorerContextProvider>
	);
}

function useSearchWithFilters(explorerSettings: UseExplorerSettings<ObjectOrder>) {
	const [searchParams, setSearchParams] = useRawSearchParams();
	const explorerSettingsSnapshot = explorerSettings.useSettingsSnapshot();

	const fixedFilters = useMemo(
		() => [
			...(explorerSettingsSnapshot.layoutMode === 'media'
				? [{ object: { kind: { in: [ObjectKindEnum.Image, ObjectKindEnum.Video] } } }]
				: [])
		],
		[explorerSettingsSnapshot.layoutMode]
	);

	const filtersParam = searchParams.get('filters');
	const dynamicFilters = useMemo(() => JSON.parse(filtersParam ?? '[]'), [filtersParam]);

	const searchQueryParam = searchParams.get('search');

	const search = useSearch({
		open: !!searchQueryParam || dynamicFilters.length > 0 || undefined,
		search: searchParams.get('search') ?? undefined,
		fixedFilters,
		dynamicFilters
	});

	useEffect(() => {
		setSearchParams(
			(p) => {
				if (search.dynamicFilters.length > 0)
					p.set('filters', JSON.stringify(search.dynamicFilters));
				else p.delete('filters');

				return p;
			},
			{ replace: true }
		);
	}, [search.dynamicFilters, setSearchParams]);

	const searchQuery = search.search;

	useEffect(() => {
		setSearchParams(
			(p) => {
				if (searchQuery !== '') p.set('search', searchQuery);
				else p.delete('search');

				return p;
			},
			{ replace: true }
		);
	}, [searchQuery, setSearchParams]);

	return search;
}
