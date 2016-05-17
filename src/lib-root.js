/**
 * Created by Dmitri on 5/14/2016.
 */
'use strict';

import PubSubFactory from './lib/pubsub-factory';
import PubSub from './lib/pubsub';

if(typeof window !== 'undefined')
{
  window.PubSubFactory = PubSubFactory;
  window.PubSub = PubSub;
}

export {PubSub};
export {PubSubFactory};