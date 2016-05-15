'use strict';

import PubSubFactory from '../src/lib/pubsub-factory';
import PubSub from '../src/lib/pubsub';
import chai from './../node_modules/chai/chai';
let expect = chai.expect;
chai.should();

let DEFAULT = PubSubFactory.DefaultKey;

class MyPubSub extends PubSub
{
  constructor(a, b)
  {
    super();
    this.a = a;
    this.b = b;
  }
}

describe('PubSubFactory Spec', function()
{
  beforeEach(function()
  {
    PubSubFactory.destroyInstance(DEFAULT);
    PubSubFactory.setSpecies(PubSub);
  });
  it('has default instance', function()
  {
    let defInst = PubSubFactory.instance;
    expect(defInst).to.exist;
    defInst.should.be.instanceof(PubSub);
  });
  it('has settable species', function()
  {
    PubSubFactory.destroyInstance(DEFAULT);
    PubSubFactory.setSpecies(MyPubSub, 'foo', 'bar');
    let defInst = PubSubFactory.instance;
    defInst.should.be.instanceof(MyPubSub);
    defInst.should.have.property('a', 'foo');
    defInst.should.have.property('b', 'bar');
  });
  it('can create keyed instances and retrieve them', function()
  {
    let sym = Symbol();
    let inst = PubSubFactory.createInstance(sym);
    expect(inst).to.exist;
    PubSubFactory.getInstance(sym).should.equal(inst);
  });
  it('can destroy keyed instances', function()
  {
    let sym = Symbol();
    expect(PubSubFactory.createInstance(sym)).to.exist;
    PubSubFactory.destroyInstance(sym);
    expect(PubSubFactory.getInstance(sym)).to.not.exist;
  });
  it('passes custom arguments to new keyed instances', function()
  {
    PubSubFactory.destroyInstance(DEFAULT);
    PubSubFactory.setSpecies(MyPubSub, 'foo', 'bar');
    let defInst = PubSubFactory.instance;
    let inst = PubSubFactory.createInstance(Symbol(), 'FOO', 'BAR');
    inst.should.have.property('a', 'FOO');
    inst.should.have.property('b', 'BAR');
    inst.should.not.equal(defInst);
  });
});
