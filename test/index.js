import test from 'tape'
import composeForm from '../lib'
import { List } from 'immutable'
import dataSimple from './fixtures/data-simple'
import textForm from './fixtures/text-form'

const isFunction = function (obj) {
  return typeof obj === 'function'
}

test('it should compose a form template', (nest) => {
  let formTemplate = composeForm({})

  nest.test('... returning a callable function', (assert) => {
    assert.ok(isFunction(formTemplate), 'compose form is a function')
    assert.end()
  })
})
test('it should create a form instance from a composed template', (nest) => {
  let formTemplate = composeForm({})
  let form = formTemplate()

  nest.test('... with a render method', (assert) => {
    assert.ok(form.hasOwnProperty('render'), 'form has a render property')
    assert.ok(isFunction(form.render), 'render is a function')
    assert.end()
  })

  nest.test('... with a store property', (assert) => {
    assert.ok(form.hasOwnProperty('store'), 'form has a store property')
    assert.end()
  })
})

test('it should consume an abstract syntax tree', (nest) => {
  let formTemplate = composeForm(textForm)
  let form = formTemplate(dataSimple)
  nest.test('... and return it as a redux store', (assert) => {
    assert.ok(form.store.hasOwnProperty('dispatch'), 'store has a dispatch property')
    assert.ok(isFunction(form.store.dispatch), 'store has a dispatch function')
    assert.ok(form.store.hasOwnProperty('getState'), 'store has a getState property')
    assert.ok(isFunction(form.store.getState), 'store has a getState function')
    assert.ok(form.store.hasOwnProperty('subscribe'), 'store has a subscribe property')
    assert.ok(isFunction(form.store.subscribe), 'store has a subscribe function')
    assert.end()
  })
  nest.test('... and convert it to an immutable list', (assert) => {
    let list = form.store.getState()
    assert.ok(List.isList(list), 'list is Immutable.List')
    assert.end()
  })
  nest.test('... with values matching the paths in the original data', (assert) => {
    let list = form.store.getState()

    let original = dataSimple[0][1][2]
    let parsed = list.getIn([0, 1, 2])
    assert.equals(parsed, original)

    original = dataSimple[1][1][2]
    parsed = list.getIn([1, 1, 2])
    assert.equals(parsed, original)

    assert.end()
  })
})

test('it should render a form', (nest) => {
  let formTemplate = composeForm(textForm)
  let form = formTemplate(dataSimple)
  nest.test('... matching the structure in the data', (assert) => {
    let renderedForm = form.render()
    let expected = 'field:id-123,field:title-Title goes here'
    assert.equals(renderedForm.join(), expected)
    assert.end()
  })
})