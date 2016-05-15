/**
 * Created by Dmitri on 5/15/2016.
 */
'use strict';

let nextFrame = null;

if(typeof window === 'object')
{
  nextFrame = window.requestAnimationFrame ||
    function (func)
    {
      return setTimeout(func, 17);
    };
}
else
{
  nextFrame = setImmediate;
}

function debounce(func, ...args)
{
  if(func instanceof Function)
    setTimeout(func, 0, ...args);
}

export {nextFrame, debounce}