import { forwardRef } from 'react';
import { Button, tw } from '@sd/ui';
import { ReactComponent as Ellipsis } from '@sd/assets/svgs/ellipsis.svg';

export const SubtleButton = forwardRef<HTMLButtonElement, { icon?: React.FC }>((props, ref) => {
    const Icon = props.icon ?? Ellipsis;

    return (
        <Button ref={ref} className="!p-[5px]" variant="subtle">
            {/* @ts-expect-error */}
            <Icon weight="bold" className="size-3" />
        </Button>
    );
});

SubtleButton.displayName = 'SubtleButton';

export const SubtleButtonContainer = tw.div`opacity-0 text-ink-faint group-hover:opacity-30 hover:!opacity-100`;
