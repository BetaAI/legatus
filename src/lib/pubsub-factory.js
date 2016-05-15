/**
 * Created by Dmitri on 5/6/2016.
 */

import PubSub from './pubsub';

const DEFAULT = Symbol();
const FactoryMap = new Map();
var Species = PubSub;
var Args = [];

class PubSubFactory
{
  static get DefaultKey()
  {
    return DEFAULT;
  }

  static get instance()
  {
    if(FactoryMap.has(DEFAULT))
      return FactoryMap.get(DEFAULT);
    return PubSubFactory.createInstance(DEFAULT, ...Args);
  }

  static setSpecies(val, ...rest)
  {
    Species = val;
    Args = rest;
  }

  static getInstance(key)
  {
    return FactoryMap.get(key);
  }

  static createInstance(key, ...rest)
  {
    if(rest.length == 0)
      rest = Args;
    let result = new Species(...rest);
    FactoryMap.set(key, result);
    return result;
  }

  static destroyInstance(key)
  {
    FactoryMap.delete(key);
  }
}

export default PubSubFactory;
