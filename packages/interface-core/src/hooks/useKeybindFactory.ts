import { keybindForOs } from '../keybinds';
import { useOperatingSystem } from './useOperatingSystem';

export const useKeybindFactory = () => keybindForOs(useOperatingSystem());
