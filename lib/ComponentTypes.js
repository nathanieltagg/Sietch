"use strict";

const Components = require("./Components.js");
const Forms = require("./Forms.js");
const deepmerge = require('deepmerge');
var Cache = require("./Cache.js");


module.exports = {
  list,
}

Cache.add('componentTypes',
    async function(){
      logger.info("regenerating componentTypes");
      var types = await Components.getTypes();
      var forms = await Forms.list('componentForms');
      var componentTypes = deepmerge(types,forms);
      return componentTypes;
  },
  ['componentCountsByType','formlist_componentForms'] // invalidate if these are invalidated
);

async function list()
{
  // returns component counts, formId, formName, tags, icon for type listed, or all types if no argument
  var types =  await Cache.current('componentTypes');
  return types;
}

