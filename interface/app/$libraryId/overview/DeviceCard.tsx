import { useEffect, useMemo, useState } from 'react';
import { humanizeSize } from '@sd/client';
import { Card, CircularProgress, tw } from '@sd/ui';
import { Icon } from '~/components';
import { useIsDark, useLocale } from '~/hooks';
import StatCard from './StatCard';

type StatCardProps = {
    name: string;
    icon: string;
    totalSpace: string | number[];
    freeSpace?: string | number[];
    color: string;
    connectionType: 'lan' | 'p2p' | 'cloud' | null;
};



const Pill = tw.div`px-1.5 py-[1px] rounded text-tiny font-medium text-ink-dull bg-app-box border border-app-line`;

const DeviceCard = ({ icon, name, connectionType, ...stats }: StatCardProps) => {
    const [mounted, setMounted] = useState(false);

    const isDark = useIsDark();

    const { totalSpace, freeSpace, usedSpaceSpace } = useMemo(() => {
        const totalSpace = humanizeSize(stats.totalSpace);
        const freeSpace = stats.freeSpace == null ? totalSpace : humanizeSize(stats.freeSpace);
        return {
            totalSpace,
            freeSpace,
            usedSpaceSpace: humanizeSize(totalSpace.bytes - freeSpace.bytes)
        };
    }, [stats]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const progress = useMemo(() => {
        if (!mounted || totalSpace.bytes === 0n) return 0;
        return Math.floor((usedSpaceSpace.value / totalSpace.value) * 100);
    }, [mounted, totalSpace, usedSpaceSpace]);

    const { t } = useLocale();

    return (
		<StatCard body={
			<div className="flex flex-row items-center gap-5 p-4 px-6">
                <div className="flex flex-1 flex-col overflow-hidden ">

                    <Icon className="-ml-1" name={icon as any} size={60} />
                    <span className="truncate font-medium">{name}</span>
                    <span className="mt-1 truncate text-tiny text-ink-faint">
                        {freeSpace.value}
                        {freeSpace.unit} {' ' + t('free_of') + ' ' + totalSpace.value + ' ' + totalSpace.unit}
                    </span>
                </div>
                <div className=' flex items-center justify-center'>
                    <CircularProgress
                        radius={40}
                        progress={progress}
                        strokeWidth={6}
                        trackStrokeWidth={6}
                        strokeColor={progress > 90 ? '#E14444' : '#2599FF'}
                        fillColor="transparent"
                        trackStrokeColor={isDark ? '#252631' : '#efefef'}
                        strokeLinecap="square"
                        className="flex items-center justify-center"
                        transition="stroke-dashoffset 1s ease 0s, stroke 1s ease"
                    >
                        <div className="absolute text-lg font-semibold">
                            {usedSpaceSpace.value}
                            <span className="">
                                {usedSpaceSpace.unit}
                            </span>
                        </div>
                    </CircularProgress>
            </div>
            </div>
		} footer= {
			<Pill className="uppercase">{connectionType || t('local')}</Pill>

		}>

		</StatCard>
    );
};

export default DeviceCard;
