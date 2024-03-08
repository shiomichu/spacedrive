import {
	dismissibleNoticeStore,
	getDismissibleNoticeStore,
	i18n,
	Icon,
	useDismissibleNoticeStore,
	useLocale
} from '@sd/interface-core';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { ExplorerLayout } from '@sd/client';
import { Button } from '@sd/ui';

import { useExplorerContext } from './Context';

interface Props extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
	icon?: ReactNode;
	title: string | ReactNode;
	description: string;
	onDismiss?: () => void;
	onLearnMore?: () => void;
	className?: string;
	storageKey: keyof typeof dismissibleNoticeStore;
}

export function DismissibleNotice({
	icon,
	title,
	description,
	onDismiss,
	onLearnMore,
	storageKey,
	className,
	...props
}: Props) {
	const dismissibleNoticeStore = useDismissibleNoticeStore();

	if (dismissibleNoticeStore[storageKey]) return null;

	return (
		<div
			className={clsx(
				'rounded-md bg-gradient-to-l from-accent-deep via-accent-faint to-purple-500 p-1',
				className
			)}
			{...props}
		>
			<div className="flex items-center rounded bg-app px-3 py-4">
				{icon}

				<div className="flex flex-1 flex-col justify-center">
					<h1 className="text-xl font-bold text-ink">{title}</h1>
					<p className="text-xs text-ink-dull">{description}</p>
				</div>

				<div className="ml-6 mr-3 space-x-2">
					{onLearnMore && (
						<Button
							variant="outline"
							className="border-white/10 font-medium hover:border-white/20"
							onClick={onLearnMore}
						>
							Learn More
						</Button>
					)}
					<Button
						variant="accent"
						className="font-medium"
						onClick={() => {
							getDismissibleNoticeStore()[storageKey] = true;
							onDismiss?.();
						}}
					>
						Got it
					</Button>
				</div>
			</div>
		</div>
	);
}

const MediaViewIcon = () => {
	return (
		<div className="relative ml-3 mr-10 h-14 w-14 shrink-0">
			<Icon
				name="Image"
				className="absolute -top-1 left-6 h-14 w-14 rotate-6 overflow-hidden"
			/>
			<Icon
				name="Video"
				className="absolute top-2 z-10 h-14 w-14 -rotate-6 overflow-hidden"
			/>
		</div>
	);
};

const CollectionIcon = () => {
	return (
		<div className="ml-3 mr-4 h-14 w-14 shrink-0">
			<Icon name="Collection" />
		</div>
	);
};

interface Notice {
	key: keyof typeof dismissibleNoticeStore;
	title: string;
	description: string;
	icon: ReactNode;
}

const notices = {
	grid: {
		key: 'gridView',
		title: i18n.t('grid_view'),
		description: i18n.t('grid_view_notice_description'),
		icon: <CollectionIcon />
	},
	list: {
		key: 'listView',
		title: i18n.t('list_view'),
		description: i18n.t('list_view_notice_description'),
		icon: <CollectionIcon />
	},
	media: {
		key: 'mediaView',
		title: 'Media View',
		description: i18n.t('media_view_notice_description'),
		icon: <MediaViewIcon />
	}
	// columns: undefined
} satisfies Record<ExplorerLayout, Notice | undefined>;

export default () => {
	const { t } = useLocale();

	const settings = useExplorerContext().useSettingsSnapshot();

	const notice = notices[settings.layoutMode];

	if (!notice) return null;

	return (
		<DismissibleNotice
			title={<span className="font-normal">{t('meet_title', { title: notice.title })}</span>}
			icon={notice.icon}
			description={notice.description}
			className="m-5"
			storageKey={notice.key}
			onContextMenu={(e) => e.preventDefault()}
		/>
	);
};
