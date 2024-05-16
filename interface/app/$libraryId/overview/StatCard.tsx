import { useEffect, useState } from 'react';
import { Card, tw } from '@sd/ui';
type StatCardProps = {
    body: React.ReactNode;
	footer: React.ReactNode;
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

const StatCard = ({ body, footer }: StatCardProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Card className="group/open flex w-[280px] shrink-0 flex-col bg-app-box/50 !p-0">
                {body}
			<div className="flex h-10 flex-row items-center gap-1.5 border-t border-app-line px-2">
				{footer}
			</div>
        </Card>
    );
};

export default StatCard;
