import React from 'react';
import { DropdownMenu } from '@sd/ui';
import { Button } from '@sd/ui';
import { ReactComponent as Ellipsis } from '@sd/assets/svgs/ellipsis.svg';
import { Pencil, Plus, Trash } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';
import { dialogManager, toast } from '@sd/ui';
import { AddLocationDialog } from '~/app/$libraryId/settings/library/locations/AddLocationDialog';
import DeleteDialog from '~/app/$libraryId/settings/library/locations/DeleteDialog';
import { openDirectoryPickerDialog } from '~/app/$libraryId/settings/library/locations/openDirectoryPickerDialog';
import { useLocale } from '~/hooks';
import { useLibraryContext } from '@sd/client';
import { usePlatform } from '~/util/Platform';

interface LocationMenuProps {
	id: number;
}

const LocationMenu = ({ id }: LocationMenuProps) => {
	const navigate = useNavigate();
	const platform = usePlatform();
	const { t } = useLocale();
	const libraryId = useLibraryContext().library.uuid;

	const handleNewLocation = async () => {
		try {
			const path = await openDirectoryPickerDialog(platform);
			if (path !== '') {
				dialogManager.create((dp) => (
					<AddLocationDialog
						path={path ?? ''}
						libraryId={libraryId}
						{...dp}
					/>
				));
			}
		} catch (error) {
			toast.error(t('error_message', { error }));
		}
	};

	const handleEditLocation = () => {
			navigate(`../settings/library/locations/${id}`);
	};

	const handleDeleteLocation = (e: React.MouseEvent) => {
		e.stopPropagation();
		dialogManager.create((dp) => (
			<DeleteDialog
				{...dp}
				onSuccess={() => navigate('./')}
				locationId={id}
			/>
		));
	};

	return (
		<DropdownMenu.Root
			onOpenChange={(open) => {
				console.log('Dropdown menu open state:', open);
			}}
			trigger={
				<Button className="!p-[5px]">
					<Ellipsis className="size-3" />
				</Button>
			}
		>
			<DropdownMenu.Item onSelect={handleNewLocation} icon={Plus} label={t('new_location')} />
			<DropdownMenu.Item onSelect={handleEditLocation} icon={Pencil} label={t('edit')} />
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={handleDeleteLocation} icon={Trash} label={t('delete')} variant="danger" />
		</DropdownMenu.Root>
	);
};

export default LocationMenu;
