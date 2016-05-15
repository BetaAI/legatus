'use strict';
import PubSubFactory from '../src/lib/pubsub-factory';

import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
let expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

let DEFAULT = PubSubFactory.DefaultKey;


describe('PubSub Spec', function()
{
  let pubSub;
  let subA = Symbol('A');
  let subB = Symbol('B');
  let subC = Symbol('C');
  let Subscriber = function(sid)
  {
    this.onSub = function(resolve, topic, envelope)
    {
      //console.log(`${sid.toString()} resolved topic`, topic, 'with envelope ', envelope);
      resolve();
    };
    this.sub = function(topic = null, pri)
    {
      return new Promise((resolve, reject) =>
      {
        pubSub.subscribe(sid, this.onSub.bind(this, resolve) , topic, pri);
        setTimeout(reject, 50);
      });
    }
  };

  describe('Internals', function()
  {
    beforeEach(function()
    {
      PubSubFactory.destroyInstance(DEFAULT);
      pubSub = PubSubFactory.instance;
    });
    it('parse topics', function()
    {
      let symA = Symbol('A');
      let symB = Symbol('B');
      let symC = Symbol('C');
      let obj = {foo:'foo', bar:'bar'};
      pubSub.toTopic('A.B.**.C').should.deep.equal(['A','B','**','C']);
      pubSub.toTopic([symA, symB, symC]).should.deep.equal([symA,symB,symC]);
      pubSub.toTopic([symA, ['A.B-C', [obj, symB]], symC]).should.deep.equal([symA,'A','B-C',obj,symB,symC]);
      pubSub.strDelim = '/';
      pubSub.toTopic([symA, ['A.B', [obj, symB]], symC]).should.deep.equal([symA,'A.B',obj,symB,symC]);
    });
    it('create envelopes', function()
    {
      let data = Symbol();
      let origin = Symbol();
      pubSub.toEnvelope(data, origin).should.deep.equal({data:data, origin:origin});
    });
    it('register subscriptions', function()
    {
      let sidSet;
      pubSub.subscribe(subA, null, 'A.B.C');
      pubSub.subscribe(subB, null, [subA, subB, subC]);
      pubSub.subscribe(subC, null, 'A.*.C');
      pubSub.subscribe(subC, null, [subA, '**']);
      sidSet = pubSub.$toSidSet(pubSub.toTopic('A.B.C'));
      expect([...sidSet]).to.include(subA).and.include(subC);
      sidSet = pubSub.$toSidSet(pubSub.toTopic([subA, subB, subC]));
      expect([...sidSet]).to.include(subB).and.include(subC);
      sidSet = pubSub.$toSidSet(pubSub.toTopic([subA, 'C.D']));
      expect([...sidSet]).to.include(subC);
    });
    it('de-register subscriptions', function()
    {
      let sidSet;
      pubSub.subscribe(subA, null, [subA, '**']);
      pubSub.subscribe(subA, null, ['A', '**']);
      pubSub.subscribe(subB, null, '**');
      //we should be subscribed on A.B.C through wildcard
      sidSet = pubSub.$toSidSet(pubSub.toTopic('A.B.C'));
      expect([...sidSet]).to.include(subA);
      //subscribe to strict A.B.C unsub from A.**
      pubSub.subscribe(subA, null, 'A.B.C');
      pubSub.unsubscribe(subA, 'A.**');
      expect(pubSub.$actionReg.has(subA)).to.be.true;
      sidSet = pubSub.$toSidSet(pubSub.toTopic('A.B.C'));
      expect([...sidSet]).to.include(subA); //through A.B.C sub
      sidSet = pubSub.$toSidSet(pubSub.toTopic('A.B'));
      expect([...sidSet]).to.not.include(subA); //A.** removed
      sidSet = pubSub.$toSidSet(pubSub.toTopic([subA,'B.C']));
      expect([...sidSet]).to.include(subA); //through (subA).B.C sub
      //unsub from something we never subscribed
      pubSub.unsubscribe(subA, [subA, subB]);
      expect(pubSub.$actionReg.has(subA)).to.be.true;
      sidSet = pubSub.$toSidSet(pubSub.toTopic([subA,'B.C']));
      expect([...sidSet]).to.include(subA);
      //unsub for real
      pubSub.unsubscribe(subA, [subA, '**']);
      expect(pubSub.$actionReg.has(subA)).to.be.true;
      sidSet = pubSub.$toSidSet(pubSub.toTopic([subA,'B.C']));
      expect([...sidSet]).to.not.include(subA);
      sidSet = pubSub.$toSidSet(pubSub.toTopic(['A','B.C']));
      expect([...sidSet]).to.include(subA); //through A.B.C sub
      //unsub from last topic
      pubSub.unsubscribe(subA, ['A', 'B.C']);
      expect(pubSub.$actionReg.has(subA)).to.be.false;
      sidSet = pubSub.$toSidSet(pubSub.toTopic(['A','B.C']));
      expect([...sidSet]).to.not.include(subA);
      //test general unsubscription
      pubSub.subscribe(subA, null, 'A.B.C');
      pubSub.subscribe(subA, null, 'A.*.C');
      expect(pubSub.$actionReg.has(subA)).to.be.true;
      pubSub.unsubscribe(subA);
      expect(pubSub.$actionReg.has(subA)).to.be.false;
      sidSet = pubSub.$toSidSet(pubSub.toTopic(['A','B.C']));
      expect([...sidSet]).to.not.include(subA);
    });
  });
  describe('Async functionality', function()
  {
    beforeEach(function()
    {
      PubSubFactory.destroyInstance(DEFAULT);
      pubSub = PubSubFactory.instance;
    });
    it('actions get called', function()
    {
      let prmA = new Subscriber(subA).sub('A.*.C');
      let prmB = new Subscriber(subB).sub('A.B');

      pubSub.publish('A.B.C', {foo:'foo'});

      return Promise.all(
        [
          prmA.should.be.fulfilled,
          prmB.should.be.rejected
        ]);
    });
    it('subscription priorities are followed', function()
    {
      let objA = new Subscriber(subA);
      let spyA = sinon.spy(objA, 'onSub');
      let objB = new Subscriber(subB);
      let spyB = sinon.spy(objB, 'onSub');

      let prmA = objA.sub('A.B.C', 2);
      let prmB = objB.sub('A.B.C', 1);
      pubSub.publish('A.B.C', 1, null, 1);

      let promises = [prmA.should.be.fulfilled, prmB.should.be.fulfilled];
      return Promise.all(promises).then(() =>
      {
        spyA.calledBefore(spyB).should.be.true;
      });
    });
    it('publish priorities are followed', function()
    {
      let objA = new Subscriber(subA);
      let spyA = sinon.spy(objA, 'onSub');
      let objB = new Subscriber(subB);
      let spyB = sinon.spy(objB, 'onSub');

      let prmA = objA.sub('A.B.C', 1);
      let prmB = objB.sub('A.B', 1);
      pubSub.publish('A.B.C', 1, null, 1);
      pubSub.publish('A.B', 2, null, 2);

      let promises = [prmA.should.be.fulfilled, prmB.should.be.fulfilled];
      return Promise.all(promises).then(() =>
      {
        spyB.calledBefore(spyA).should.be.true;
      });
    });
  });
});