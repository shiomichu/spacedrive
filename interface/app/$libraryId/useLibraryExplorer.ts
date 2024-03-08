import { useExplorer as _useExplorer, Ordering, UseExplorer, UseExplorerProps } from '@sd/explorer';

import { useTopBarContext } from './TopBar/Layout';

// regular useExplorer with some values wired up to library-specific stuff
export function useLibraryExplorer<TOrder extends Ordering>(
	props: Omit<UseExplorerProps<TOrder>, 'topPadding'>
): UseExplorer<TOrder> {
	const topBar = useTopBarContext();

	return _useExplorer({
		...props,
		topPadding: topBar.topBarHeight
	});
}
