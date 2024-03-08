import { useLocale } from '@sd/web-core';
import { ScreenHeading } from '@sd/ui';

export const Component = () => {
	const { t } = useLocale();
	return <ScreenHeading>{t('people')}</ScreenHeading>;
};
