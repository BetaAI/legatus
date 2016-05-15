/**
 * Created by Dmitri on 5/6/2016.
 */
'use strict';
import * as Util from './util';

const ascendingComp = (a, b) => a.priority - b.priority;
const WILD_ONE = '*';
const WILD_ANY = '**';
const INTERN = Symbol();

class PubSub
{
  constructor()
  {
    this.$topicReg = new Map();
    this.$actionReg = new Map();
    this.$topicReg.set(INTERN, {parent:null, key:null, sids: new Set()});
    this.$queue = [];
    this.$frame = null;

    this.strDelim = '.';
    this.defPubPriority = 0;
  }

  //===== PROTECTED METHODS ============================================================================================
  $getReg(topic, reg = this.$topicReg, create = false)
  {
    let len = topic.length;
    for(let i = 0; i < len && reg; i++)
    {
      let key = topic[i];
      if(!reg.has(key) && create)
      {
        let intern = {parent:reg, key:key, sids: new Set()};
        reg = new Map();
        reg.set(INTERN, intern);
        intern.parent.set(key, reg);
      }
      else
        reg = reg.get(key);
    }
    return reg;
  }

  $cascadeDel(sid, reg)
  {
    if(!reg)
      return false;
    let intern = reg.get(INTERN);
    if(!intern)
      return false;
    let result = intern.sids.delete(sid);
    while(reg.size === 1 &&
      intern.sids.size === 0 &&
      intern.parent !== null)
    {
      intern.parent.delete(intern.key);
      reg = intern.parent;
      intern = reg.get(INTERN);
    }
    return result;
  }

  $addSid(sid, topic, reg = this.$topicReg)
  {
    reg = this.$getReg(topic, reg, true);
    let result;
    let sids = reg.get(INTERN).sids;
    if(result = !sids.has(sid))
      sids.add(sid);
    return result;
  }

  $delSid(sid, topic = null, reg = this.$topicReg)
  {
    if(topic === null)
    {
      let queue = [];
      while(reg)
      {
        for(let [key, val] of reg)
        {
          if(key !== INTERN)
            queue.push(val);
        }
        this.$cascadeDel(sid, reg);
        reg = queue.shift();
      }
    }
    else
      return this.$cascadeDel(sid, this.$getReg(topic, reg));
    return false;
  }

  $toSidSet(topic, reg = this.$topicReg, depth = 0, result = null)
  {
    if(result === null)
      result = new Set();
    let intern = reg.get(INTERN);
    let topicLen = topic.length;
    let depthNext = depth + 1;

    if(intern.key === WILD_ANY || depth === topicLen)
    {
      for(let sid of intern.sids)
      {
        result.add(sid);
      }
    }
    if(topicLen > depth)
    {
      let topicKey = topic[depth];
      //check wildcards and next key
      if(reg.has(WILD_ONE))
        this.$toSidSet(topic, reg.get(WILD_ONE), depthNext, result);
      if(reg.has(WILD_ANY))
        this.$toSidSet(topic, reg.get(WILD_ANY), depthNext, result);
      if(reg.has(topicKey))
        this.$toSidSet(topic, reg.get(topicKey), depthNext, result);
      if(intern.key === WILD_ANY)
      {
        for(let i = depthNext; i < topicLen; i++)
        {
          topicKey = topic[i];
          if(reg.has(topicKey))
            this.$toSidSet(topic, reg.get(topicKey), i + 1, result);
        }
      }
    }
    return result;
  }

  $dispatch()
  {
    let queue = this.$queue;
    this.$queue = [];
    this.$frame = null;

    let actionArr = [];
    queue.sort(ascendingComp);
    for(let i = queue.length; --i >= 0;)
    {
      let topic = queue[i].topic;
      let envelope = queue[i].envelope;
      let sidSet = this.$toSidSet(topic);
      for(let sid of sidSet)
      {
        actionArr.push(this.$actionReg.get(sid));
      }
      actionArr.sort(ascendingComp);
      for(let j = actionArr.length; --j >= 0;)
      {
        Util.debounce(actionArr[j].action, topic, envelope);
      }
      actionArr.length = 0;
    }
  }

  $pubImpl(topic, envelope, priority)
  {
    this.$queue.push({topic, envelope, priority});
    if(this.$frame === null)
      this.$frame = Util.nextFrame(this.$dispatch.bind(this));
  }

  $subImpl(sid, action, topic, priority)
  {
    let subObj = this.$actionReg.get(sid);
    if(!subObj)
    {
      subObj = {action:action, priority:this.defPubPriority, topics:0};
      this.$actionReg.set(sid, subObj);
    }
    if(action !== null)
      subObj.action = action;
    if(!Number.isNaN(priority))
      subObj.priority = priority;
    if(topic !== null && this.$addSid(sid, topic))
      subObj.topics++;
  }

  $unsubImpl(sid, topic)
  {
    let subObj = this.$actionReg.get(sid);
    if(subObj)
    {
      if(this.$delSid(sid, topic))
        subObj.topics--;
      if(topic === null || subObj.topics <= 0)
        this.$actionReg.delete(sid);
    }
  }

  toEnvelope(data, origin)
  {
    return {data, origin};
  }

  toTopic(obj, result = null)
  {
    if(!obj)
      return result;

    if(!Array.isArray(result))
      result = [];
    if(typeof obj === 'string')
    {
      obj = obj.split(this.strDelim);
      let len = obj.length;
      for(let i = 0; i < len; i++)
      {
        result.push(obj[i]);
      }
    }
    else if(Array.isArray(obj))
    {
      let len = obj.length;
      for(let i = 0; i < len; i++)
      {
        this.toTopic(obj[i], result);
      }
    }
    else
      result.push(obj);
    return result;
  }

  //===== API METHODS ==================================================================================================
  publish(topic, data = null, origin = null, priority = this.defPubPriority)
  {
    this.$pubImpl(this.toTopic(topic), this.toEnvelope(data, origin), priority);
    return this;
  }

  subscribe(sid, action = null, topic = null, priority = Number.NaN)
  {
    if(!sid)
      throw new Error(`Invalid sid: ${sid}`);
    this.$subImpl(sid, action, this.toTopic(topic), priority);
    return this;
  }

  unsubscribe(sid, topic = null)
  {
    if(!sid)
      throw new Error(`Invalid sid: ${sid}`);
    this.$unsubImpl(sid, this.toTopic(topic));
    return this;
  }
}

export default PubSub;