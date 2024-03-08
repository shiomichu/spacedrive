import { OperatingSystem } from '@sd/web-core';

export const macOnly = (platform: OperatingSystem | undefined, classnames: string) =>
	platform === 'macOS' ? classnames : '';
