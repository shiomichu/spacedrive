import {
	createDefaultExplorerSettings,
	Explorer,
	ExplorerContextProvider,
	useExplorerSettings
} from '@sd/explorer';
import { Icon, useRouteTitle, useZodRouteParams } from '@sd/interface-core';
import { useMemo } from 'react';
import { useBridgeQuery, useLibraryQuery } from '@sd/client';
import { NodeIdParamsSchema } from '~/app/route-schemas';

import { DefaultTopBarOptions } from '../Layout/TopBarOptions';
import { TopBarPortal } from '../TopBar/Portal';
import { useLibraryExplorer } from '../useLibraryExplorer';

export const Component = () => {
	const { id: nodeId } = useZodRouteParams(NodeIdParamsSchema);

	const query = useLibraryQuery(['nodes.listLocations', nodeId]);

	const nodeState = useBridgeQuery(['nodeState']);

	const title = useRouteTitle(nodeState.data?.name || 'Node');

	const explorerSettings = useExplorerSettings({
		settings: useMemo(
			() =>
				createDefaultExplorerSettings<never>({
					order: null
				}),
			[]
		)
	});

	const explorer = useLibraryExplorer({
		items: query.data || null,
		parent: nodeState.data
			? {
					type: 'Node',
					node: nodeState.data
				}
			: undefined,
		settings: explorerSettings,
		showPathBar: false,
		layouts: { media: false }
	});

	return (
		<ExplorerContextProvider explorer={explorer}>
			<TopBarPortal
				left={
					<div className="flex items-center gap-2">
						<Icon name="Laptop" size={24} className="mt-[-1px]" />
						<span className="truncate text-sm font-medium">{title}</span>
					</div>
				}
				right={<DefaultTopBarOptions />}
			/>

			<Explorer />
		</ExplorerContextProvider>
	);
};
