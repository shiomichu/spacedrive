import { Copy, Scissors } from '@phosphor-icons/react';
import { useKeybindFactory, useLocale } from '@sd/interface-core';
import { isNonEmpty } from '@sd/client';
import { ContextMenu, ModifierKeys } from '@sd/ui';

import { useExplorerContext } from '../../Context';
import { useExplorerCopyPaste } from '../../hooks/useExplorerCopyPaste';
import { ConditionalItem } from '../ConditionalItem';
import { useContextMenuContext } from '../context';

export const CutCopyItems = new ConditionalItem({
	useCondition: () => {
		const { parent } = useExplorerContext();
		const { selectedFilePaths, selectedEphemeralPaths } = useContextMenuContext();

		if (
			(parent?.type !== 'Location' && parent?.type !== 'Ephemeral') ||
			(!isNonEmpty(selectedFilePaths) && !isNonEmpty(selectedEphemeralPaths))
		)
			return null;

		return { parent, selectedFilePaths, selectedEphemeralPaths };
	},
	Component: () => {
		const { t } = useLocale();
		const keybind = useKeybindFactory();
		const { copy, cut, duplicate } = useExplorerCopyPaste();

		return (
			<>
				<ContextMenu.Item
					label={t('cut')}
					keybind={keybind([ModifierKeys.Control], ['X'])}
					onClick={cut}
					icon={Scissors}
				/>

				<ContextMenu.Item
					label={t('copy')}
					keybind={keybind([ModifierKeys.Control], ['C'])}
					onClick={copy}
					icon={Copy}
				/>

				<ContextMenu.Item
					label={t('duplicate')}
					keybind={keybind([ModifierKeys.Control], ['D'])}
					onClick={duplicate}
				/>
			</>
		);
	}
});
