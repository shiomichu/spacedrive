import {
	Platform,
	useKeybindFactory,
	useLocale,
	useOperatingSystem,
	usePlatform
} from '@sd/interface-core';
import { NonEmptyArray, useLibraryContext } from '@sd/client';
import { Menu, ModifierKeys } from '@sd/ui';

const lookup: Record<string, string> = {
	macOS: 'Finder',
	windows: 'Explorer'
};

export type RevealItems = NonEmptyArray<
	Parameters<NonNullable<Platform['revealItems']>>[1][number]
>;

export const RevealInNativeExplorerBase = (props: { items: RevealItems }) => {
	const os = useOperatingSystem();
	const keybind = useKeybindFactory();
	const { t } = useLocale();
	const { library } = useLibraryContext();
	const { revealItems } = usePlatform();
	if (!revealItems) return null;

	const osFileBrowserName = lookup[os] ?? 'file manager';

	return (
		<Menu.Item
			label={t('revel_in_browser', { browser: osFileBrowserName })}
			keybind={keybind([ModifierKeys.Control], ['Y'])}
			onClick={() => revealItems(library.uuid, props.items)}
		/>
	);
};
