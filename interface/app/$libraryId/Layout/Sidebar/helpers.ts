import { OperatingSystem } from '@sd/interface-core';

export const macOnly = (platform: OperatingSystem | undefined, classnames: string) =>
	platform === 'macOS' ? classnames : '';
