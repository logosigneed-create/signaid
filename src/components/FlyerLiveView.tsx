/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Droppaid.ai - Vue Live du Flyer pour Hub Public
 * Re-export et composant de présentation dédié au Live Hub
 */

import React from 'react';
import { FlyerPosterRenderer, FlyerPosterRendererProps } from './FlyerPosterRenderer';

export interface FlyerLiveViewProps extends Partial<FlyerPosterRendererProps> {
  projectData?: any;
}

export const FlyerLiveView: React.FC<FlyerLiveViewProps> = (props) => {
  return (
    <FlyerPosterRenderer
      {...props}
      isInteractive={false}
    />
  );
};

export default FlyerLiveView;
export { FlyerPosterRenderer };
