import {
	createDefaultExplorerSettings,
	EmptyNotice,
	Explorer,
	ExplorerContextProvider,
	objectOrderingKeysSchema,
	useExplorerSettings
} from '@sd/explorer';
import { Icon, useRouteTitle } from '@sd/interface-core';
import { useMemo } from 'react';
import { ObjectOrder, useLibraryQuery } from '@sd/client';

import { DefaultTopBarOptions } from './Layout/TopBarOptions';
import { SearchContextProvider, SearchOptions, useSearch } from './search';
import SearchBar from './search/SearchBar';
import { TopBarPortal } from './TopBar/Portal';
import { useLibraryExplorer } from './useLibraryExplorer';

export function Component() {
	useRouteTitle('Labels');

	const labels = useLibraryQuery(['labels.listWithThumbnails', '']);

	const explorerSettings = useExplorerSettings({
		settings: useMemo(() => {
			return createDefaultExplorerSettings<ObjectOrder>({ order: null });
		}, []),
		orderingKeys: objectOrderingKeysSchema
	});

	// const explorerSettingsSnapshot = explorerSettings.useSettingsSnapshot();

	// const fixedFilters = useMemo<SearchFilterArgs[]>(
	// 	() => [
	// 		...(explorerSettingsSnapshot.layoutMode === 'media'
	// 			? [{ object: { kind: { in: [ObjectKindEnum.Image, ObjectKindEnum.Video] } } }]
	// 			: [])
	// 	],
	// 	[explorerSettingsSnapshot.layoutMode]
	// );

	const search = useSearch({});

	// const objects = useObjectsExplorerQuery({
	// 	arg: {
	// 		take: 100,
	// 		filters: [...search.allFilters, { object: { tags: { in: [3] } } }]
	// 	},
	// 	explorerSettings
	// });

	const explorer = useLibraryExplorer({
		items: labels.data || null,
		settings: explorerSettings,
		showPathBar: false,
		layouts: { media: false, list: false }
	});

	return (
		<ExplorerContextProvider explorer={explorer}>
			<SearchContextProvider search={search}>
				<TopBarPortal
					center={<SearchBar />}
					left={
						<div className="flex flex-row items-center gap-2">
							<span className="truncate text-sm font-medium">Labels</span>
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
						icon={<Icon name="CollectionSparkle" size={128} />}
						message="No labels"
					/>
				}
			/>
		</ExplorerContextProvider>
	);
}
