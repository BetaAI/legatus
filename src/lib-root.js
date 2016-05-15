/**
 * Created by Dmitri on 5/14/2016.
 */
'use strict';

import PubSubFactory from './lib/pubsub-factory';

if(typeof window !== 'undefined')
  window.PubSubFactory = PubSubFactory;

export * from './lib/pubsub-factory';