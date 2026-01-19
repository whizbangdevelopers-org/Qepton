/**
 * Basic Plugins Index
 * Export all free tier plugins
 */

export { exportPlugin } from './export-plugin';

import { exportPlugin } from './export-plugin';
import type { QeptonPlugin } from '../../core/types';

/**
 * Get all basic plugins
 */
export function getBasicPlugins(): QeptonPlugin[] {
  return [exportPlugin];
}

export default getBasicPlugins;
