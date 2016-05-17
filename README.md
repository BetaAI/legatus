# Legatus

[![Travis](https://img.shields.io/travis/BetaAI/legatus.svg?branch=master?style=flat-square)]()

A Pub-Sub library with hierarchical subsriptions

# Instalation

is straight forward
```
npm install legatus
```
# Usage

Legatus can be used in both Node.js and Browser

####Basic Use Example (Node.js)

In this example we create 3 different subscribers with IDs `Foo`, `Bar`, and `All`. We then publish to different topics.
```javascript
var lib = require('legatus');

var factory = lib.PubSubFactory;
var pubsub = factory.instance;
//create an action function which will be called on a
var onPub = function(sub, topic, envelope) {console.log('OnSub: ' + sub, topic, envelope);}
//create topic subscriptions
pubsub.subscribe('Foo', onPub.bind(null, 'Foo'), 'Foo.**.C');
pubsub.subscribe('Bar', onPub.bind(null, 'Bar'), 'Bar.*.C');
pubsub.subscribe('All', onPub.bind(null, 'All'), '**.C');
//publish to topics
pubsub.publish('Foo.A.B.C', 0);//published to 'Foo' and 'All' subscribers
pubsub.publish('Foo.C', 1);//published only to 'All' subscriber
pubsub.publish('Bar.A.B.C', 2);//published only to 'All' subscriber
pubsub.publish('Bar.A.C', 3);//published to 'Bar' and 'All' subscribers
pubsub.publish('FooBar.C', 4);//published only to 'All' subscriber
```
Here is the output
```
OnSub: All [ 'FooBar', 'C' ] { data: 4, origin: null }
OnSub: Bar [ 'Bar', 'A', 'C' ] { data: 3, origin: null }
OnSub: All [ 'Bar', 'A', 'C' ] { data: 3, origin: null }
OnSub: All [ 'Bar', 'A', 'B', 'C' ] { data: 2, origin: null }
OnSub: All [ 'Foo', 'C' ] { data: 1, origin: null }
OnSub: Foo [ 'Foo', 'A', 'B', 'C' ] { data: 0, origin: null }
OnSub: All [ 'Foo', 'A', 'B', 'C' ] { data: 0, origin: null }
```
####API Description

######PubSubFactory

* **_DefaultKey_** - a getter for key used to identify default PubSub instance. Useful when you want to delete default instance.
* **_instance_** - a getter of default PubSub instance. Creates one if default does not exist.
* **_setSpecies(val, ...rest)_** - sets the constructor + arguments that are used to generate new PubSub instances. Useful when you are using your own PubSub extensions. First argument is constructor/class the rest are default constructor arguments.
* **_getInstance(key)_** - returns a PubSub instance associated with a key. There is no restriction on what a key can be.
* **_createInstance(key, ...rest)_** - creates a new PubSub instance and associates it with a key. If no constructor arguments (`...rest`) are provided, defaults are used.
* **_destroyInstance(key)_** - permanently removes a key from internal mappings. PubSub instance associated with it will no longer be accessible. It is a No-Op if there was no mapping.

######PubSub

* **_publish(topic, data, origin, priority)_** - method which adds a publish task to internal work queue.
  * *topic* - a topic descriptor. See **Topic** section. Note: published topics must be concrete, i.e. no wildcards.
  * *data* - data to publish. Can be anything. Default is `null`.
  * *origin* - a hint about the publisher. Default is `null`.
  * *priority* - priority of publish job. Higher number means higher priority. Jobs with highest priority will be processed first.
* **_subscribe(sid, action, topic, priority)_** - method which creates new or updates existing subscription.
  * *sid* - **s**ubscription **id** used to identify a subscriber. Value must be truthy.
  * *action* - a function that is called when a subscriber's topic waspublished to. *Sid* to *action* relationship is 1 to 1. Only 1 action is allowed per sid. Defaul is `null`. If *subscribe* is called on an existing sid with non-null action, action is updated for subscription. Null value will be ignored.
  * *topic* - a topic descriptor. See **Topic** section. Default is `null`. *Sid* to *topic* relationship is 1 to many. If *subscribe* is called on an existing sid with non-null topic, topic is added to subscription.
  * *priority* - priority of subscriber. Higher number means higher priority. Subscribers with highest priority will be processed first. Default is `NaN`, which on new subscription is converted to `defPriority`, and is left unmodified on existing subscriptions.
* **_unsubscribe(sid, topic)_** - method which removes or updates existing subscription.
  * *sid* - **s**ubscription **id** used to identify a subscriber. Value must be truthy. If *sid* does not exist in the PubSub, *unsubscribe* becimes a No-Op.
  * *topic* - topic to unsubscribe from. If topic is `null`, *unsubscribe* will completely remove the subscription for all topics of this *sid*. Default is `null`.
* **_strDelim_** - delimeter used to split string topics. Default is `.`.
* **_defPriority_** - Value of default priority. Default is 0.

*NOTE:* Publish priority is dominant.

######Topic

A topic is essentially a flat array of identifiesrs which can be anything with a few exceptions:

* If an identifier is an `Array` it is flattened. Example: `['Foo', ['Bar', 'FooBar']]` becomes `['Foo', 'Bar', 'FooBar']`.
* If an identifier is a `String`, an attempt is made to split it into an array with *strDelim* and flatten it. Example: `'Foo.Bar/FooBar'` becomes `['Foo', 'Bar/FooBar']`.

There are also 2 wildcards:

- \* - matches any one identifier. Example: `A.*.C` will match `A.B.C` and `A.C.C`, but not `A.C` and `A.B.B.C`
- \*\* - matches any one or more identifiers. Example: `A.B.**` will match any topic that begins with `A.B` and is at least 3 identifiers long
 
*NOTE:* At this time it is not possible to use wildcards within a string identifier, i.e. `A.B**` will not match `A.Bob.the.Bobcat`.

####Browser Usage

The only difference between Node and Browser is how the library is imported. You have 3 options:

1. Simply add `<script src="node_modules/legatus/dist/legatus.sfx.js"></script>` to your HTML. You will now have *window.PubSubFactory*, which you can use to get default *PubSub* instance or create your own instances accessible through your own keys. There is also a *window.PubSub* constructor if you don't want to use a factory.
2. If you are using [jspm](http://jspm.io/) you can use provided bundle located at `node_modules/legatus/dist/legatus.bundle.js` by adding it as a script in your html, or injecting it into your jspm config.
3. If you are planning on extending Legatus, both ES6(*node_modules/legatus/dist/es6*) and ES5(*node_modules/legatus/dist/es5* in CommonJS module format) are provided.

Usage is exactly the same.

# Extension

TODO: Document internal PubSub methods

# Future improvements

* Add publish promise, which is resolved when all applicable subscribers are notified.
* Add fluent API

### Library name?!?

*Legate* is an archaic term for messanger/envoy/ambassador, which is derived from latin *Legatus*.
I like it, and besides, pub-sub is aready taken. If you think of a better name, feel free to suggest it.
