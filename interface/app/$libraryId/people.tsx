import { useLocale } from '@sd/interface-core';
import { ScreenHeading } from '@sd/ui';

export const Component = () => {
	const { t } = useLocale();
	return <ScreenHeading>{t('people')}</ScreenHeading>;
};
