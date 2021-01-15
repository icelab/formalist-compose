/**
 * A schema for mapping named keys for each type of object in the AST to their
 * relevant index. So we can know what we're talking about when we pull data
 * out of what are not-easy-for-humans data structure.
 * @type {Object}
 */
const schemaMapping = {
  visit: {
    type: 0,
    definition: 1,
  },
  field: {
    name: 0,
    type: 1,
    value: 2,
    errors: 3,
    attributes: 4,
  },
  compoundField: {
    type: 0,
    attributes: 1,
    children: 2,
  },
  attr: {
    name: 0,
    type: 1,
    errors: 2,
    attributes: 3,
    children: 4,
  },
  group: {
    type: 0,
    attributes: 1,
    children: 2,
  },
  many: {
    name: 0,
    type: 1,
    errors: 2,
    attributes: 3,
    template: 4,
    contents: 5,
  },
  childForm: {
    name: 0,
    type: 1,
    children: 2,
    attributes: 3,
  },
  manyForms: {
    name: 0,
    type: 1,
    errors: 2,
    attributes: 3,
    contents: 4,
  },
  formField: {
    name: 0,
    type: 1,
    children: 2,
    attributes: 3,
  },
  section: {
    name: 0,
    type: 1,
    attributes: 2,
    children: 3,
  },
  attributes: {
    visit: {
      type: 0,
      definition: 1,
    },
    objectChildren: {
      key: 0,
      children: 1,
    },
    value: 0,
  },
};

export default schemaMapping;
