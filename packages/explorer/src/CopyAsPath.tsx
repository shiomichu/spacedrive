import { ClipboardText } from '@phosphor-icons/react';
import { useLocale } from '@sd/web-core';
import { Menu, toast } from '@sd/ui';

export const CopyAsPathBase = (
	props: { path: string } | { getPath: () => Promise<string | null> }
) => {
	const { t } = useLocale();

	return (
		<Menu.Item
			label={t('copy_as_path')}
			icon={ClipboardText}
			onClick={async () => {
				try {
					const path = 'path' in props ? props.path : await props.getPath();
					{
						/* 'path' in props
						? props.path
						: await libraryClient.query(['files.getPath', props.filePath.id]); */
					}

					if (path == null) throw new Error('No file path available');

					navigator.clipboard.writeText(path);
				} catch (error) {
					toast.error({
						title: t('failed_to_copy_file_path'),
						body: `Error: ${error}.`
					});
				}
			}}
		/>
	);
};
