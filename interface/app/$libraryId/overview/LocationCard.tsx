import { humanizeSize } from '@sd/client';
import { tw } from '@sd/ui';
import { Icon } from '~/components';
import { Link } from 'react-router-dom';
import PieChart from './PieChart';
import StatCard from './StatCard';
import LocationMenu from './LocationMenu';
import { useLocale } from '~/hooks';

type LocationCardProps = {
    name: string;
    icon: string;
	locationId: number;
    totalSpace: string | number[];
    freeSpace?: string | number[];
    color: string;
    connectionType: 'lan' | 'p2p' | 'cloud' | null;
    link?: string;
};

const data = [
	{ label: 'Category 1', value: 72 },
	{ label: 'Category 2', value: 50 },
	{ label: 'Category 3', value: 89 },
	{ label: 'Category 4', value: 50 },
	{ label: 'Category 5', value: 15 }
];

const colors = ['#0079E7', '#3F57B0', '#6D35D9', '#9621FF', '#BC13FF'];

const Pill = tw.div`px-1.5 py-[1px] rounded text-tiny font-medium text-ink-dull bg-app-box border border-app-line`;

const HoverPill = tw(Pill)`
	transition duration-300 ease-in-out
	hover:bg-[#353347] hover:cursor-pointer
`;

const LocationCard = ({ icon, name, connectionType, link, locationId, ...stats }: LocationCardProps) => {
    const totalSpace = humanizeSize(stats.totalSpace);
	const { t } = useLocale();
    return (
        <StatCard
		body={
		<div className="flex flex-row items-center gap-5 p-4 px-6">
		<div className="flex flex-1 flex-col overflow-hidden ">
			<Icon className="-ml-1" name={icon as any} size={60} />
			<span className="truncate font-medium">{name}</span>
			<span className="mt-1 truncate text-tiny text-ink-faint">
				Users/matthewyung/applications
			</span>
		</div>
		<div className=' flex items-center justify-center'>
			<PieChart
				data={data}
				radius={40}
				innerRadius={32}
				strokeWidth={0}
				colors={colors}
				units={totalSpace.unit}
			/>
		</div>
		</div>
		}
		footer={
		<>
		<Pill className="uppercase">{connectionType || t('local')}</Pill>
		<div className="ml-auto flex items-center gap-1.5">
			<Link to={link}>
				<HoverPill className="opacity-0 group-hover/open:opacity-100">OPEN</HoverPill>
			</Link>
			<LocationMenu id={locationId}></LocationMenu>
		</div>
		</>
		}>
		</StatCard>
    );
};

export default LocationCard;
