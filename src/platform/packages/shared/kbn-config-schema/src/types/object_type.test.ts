/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { expectType } from 'tsd';
import { offeringBasedSchema, schema } from '../..';
import { TypeOf } from './object_type';

test('returns value by default', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {
    name: 'test',
  };

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('meta', () => {
  const type = schema.object(
    {
      name: schema.string(),
    },
    { meta: { id: 'test_id' } }
  );
  expect(get(type.getSchema().describe(), 'flags.id')).toEqual('test_id');
});

test('returns empty object if undefined', () => {
  const type = schema.object({});
  expect(type.validate(undefined)).toEqual({});
});

test('properly parse the value if input is a string', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = `{"name": "test"}`;

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if string input cannot be parsed', () => {
  const type = schema.object({
    name: schema.string(),
  });
  expect(() => type.validate(`invalidjson`)).toThrowErrorMatchingInlineSnapshot(
    `"could not parse object value from json input"`
  );
});

test('fails with correct type if parsed input is not an object', () => {
  const type = schema.object({
    name: schema.string(),
  });
  expect(() => type.validate('[1,2,3]')).toThrowErrorMatchingInlineSnapshot(
    `"expected a plain object value, but found [Array] instead."`
  );
});

test('fails if missing required value', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {};

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [undefined]"`
  );
});

test('returns value if undefined string with default', () => {
  const type = schema.object({
    name: schema.string({ defaultValue: 'test' }),
  });
  const value = {};

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if key does not exist in schema', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    bar: 'baz',
    foo: 'bar',
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[bar]: definition for this key is missing"`
  );
});

test('defined object within object', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string({ defaultValue: 'hello world' }),
    }),
  });

  expect(type.validate({ foo: {} })).toEqual({
    foo: {
      bar: 'hello world',
    },
  });
});

test('undefined object within object', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string({ defaultValue: 'hello world' }),
    }),
  });

  expect(type.validate(undefined)).toEqual({
    foo: {
      bar: 'hello world',
    },
  });

  expect(type.validate({})).toEqual({
    foo: {
      bar: 'hello world',
    },
  });

  expect(type.validate({ foo: {} })).toEqual({
    foo: {
      bar: 'hello world',
    },
  });
});

test('object within object with key without defaultValue', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string(),
    }),
  });
  const value = { foo: {} };

  expect(() => type.validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"[foo.bar]: expected value of type [string] but got [undefined]"`
  );
  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[foo.bar]: expected value of type [string] but got [undefined]"`
  );
});

describe('#validate', () => {
  test('is called after all content is processed', () => {
    const mockValidate = jest.fn();

    const type = schema.object(
      {
        foo: schema.object({
          bar: schema.string({ defaultValue: 'baz' }),
        }),
      },
      {
        validate: mockValidate,
      }
    );

    type.validate({ foo: {} });

    expect(mockValidate).toHaveBeenCalledWith({
      foo: {
        bar: 'baz',
      },
    });
  });
});

test('called with wrong type', () => {
  const type = schema.object({});

  expect(() => type.validate('foo')).toThrowErrorMatchingInlineSnapshot(
    `"could not parse object value from json input"`
  );
  expect(() => type.validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected a plain object value, but found [number] instead."`
  );
});

test('handles oneOf', () => {
  const type = schema.object({
    key: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  });

  expect(type.validate({ key: 'foo' })).toEqual({ key: 'foo' });
  expect(() => type.validate({ key: 123 })).toThrowErrorMatchingInlineSnapshot(`
    "[key]: types that failed validation:
    - [key.0]: expected value of type [string] but got [number]
    - [key.1]: expected value of type [array] but got [number]"
  `);
});

test('handles references', () => {
  const type = schema.object({
    context: schema.string({
      defaultValue: schema.contextRef('context_value'),
    }),
    key: schema.string(),
    value: schema.string({ defaultValue: schema.siblingRef('key') }),
  });

  expect(type.validate({ key: 'key#1' }, { context_value: 'context#1' })).toEqual({
    context: 'context#1',
    key: 'key#1',
    value: 'key#1',
  });
  expect(type.validate({ key: 'key#1', value: 'value#1' })).toEqual({
    key: 'key#1',
    value: 'value#1',
  });
});

test('handles conditionals', () => {
  const type = schema.object({
    key: schema.string(),
    value: schema.conditional(
      schema.siblingRef('key'),
      'some-key',
      schema.string({ defaultValue: 'some-value' }),
      schema.string({ defaultValue: 'unknown-value' })
    ),
  });

  expect(type.validate({ key: 'some-key' })).toEqual({
    key: 'some-key',
    value: 'some-value',
  });
  expect(type.validate({ key: 'another-key' })).toEqual({
    key: 'another-key',
    value: 'unknown-value',
  });
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.object({
    foo: schema.string(),
  });

  expect(() => type.validate([], {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected a plain object value, but found [Array] instead."`
  );
});

test('includes namespace in failure when wrong value type', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    foo: 123,
  };

  expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.foo]: expected value of type [string] but got [number]"`
  );
});

test('individual keys can validated', () => {
  const type = schema.object({
    foo: schema.boolean(),
  });

  const value = false;
  expect(() => type.validateKey('foo', value)).not.toThrowError();
  expect(() => type.validateKey('bar', '')).toThrowErrorMatchingInlineSnapshot(
    `"bar is not a valid part of this schema"`
  );
});

test('allow unknown keys when unknowns = `allow`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'allow' }
  );

  expect(
    type.validate({
      bar: 'baz',
    })
  ).toEqual({
    foo: 'test',
    bar: 'baz',
  });
});

test('unknowns = `allow` affects only own keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }) },
    { unknowns: 'allow' }
  );

  expect(() =>
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[foo.baz]: definition for this key is missing"`);
});

test('does not allow unknown keys when unknowns = `forbid`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'forbid' }
  );
  expect(() =>
    type.validate({
      bar: 'baz',
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[bar]: definition for this key is missing"`);
});

test('allow and remove unknown keys when unknowns = `ignore`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'ignore' }
  );

  expect(
    type.validate({
      bar: 'baz',
    })
  ).toEqual({
    foo: 'test',
  });
});

test('unknowns = `ignore` is recursive if no explicit preferences in sub-keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }) },
    { unknowns: 'ignore' }
  );

  expect(
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toEqual({
    foo: {
      bar: 'bar',
    },
  });
});

test('unknowns = `ignore` respects local preferences in sub-keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }, { unknowns: 'forbid' }) },
    { unknowns: 'ignore' }
  );

  expect(() =>
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[foo.baz]: definition for this key is missing"`);
});

describe('nested unknowns', () => {
  test('allow unknown keys when unknowns = `allow`', () => {
    const type = schema.object({
      myObj: schema.object({ foo: schema.string({ defaultValue: 'test' }) }, { unknowns: 'allow' }),
    });

    expect(
      type.validate({
        myObj: {
          bar: 'baz',
        },
      })
    ).toEqual({
      myObj: {
        foo: 'test',
        bar: 'baz',
      },
    });
  });

  test('unknowns = `allow` affects only own keys', () => {
    const type = schema.object({
      myObj: schema.object({ foo: schema.object({ bar: schema.string() }) }, { unknowns: 'allow' }),
    });

    expect(() =>
      type.validate({
        myObj: {
          foo: {
            bar: 'bar',
            baz: 'baz',
          },
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[myObj.foo.baz]: definition for this key is missing"`);
  });

  test('does not allow unknown keys when unknowns = `forbid`', () => {
    const type = schema.object({
      myObj: schema.object(
        { foo: schema.string({ defaultValue: 'test' }) },
        { unknowns: 'forbid' }
      ),
    });
    expect(() =>
      type.validate({
        myObj: {
          bar: 'baz',
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[myObj.bar]: definition for this key is missing"`);
  });

  test('allow and remove unknown keys when unknowns = `ignore`', () => {
    const type = schema.object({
      myObj: schema.object(
        { foo: schema.string({ defaultValue: 'test' }) },
        { unknowns: 'ignore' }
      ),
    });

    expect(
      type.validate({
        myObj: {
          bar: 'baz',
        },
      })
    ).toEqual({
      myObj: {
        foo: 'test',
      },
    });
  });
  test('unknowns = `ignore` is recursive if no explicit preferences in sub-keys', () => {
    const type = schema.object({
      myObj: schema.object(
        { foo: schema.object({ bar: schema.string() }) },
        { unknowns: 'ignore' }
      ),
    });

    expect(
      type.validate({
        myObj: {
          foo: {
            bar: 'bar',
            baz: 'baz',
          },
        },
      })
    ).toEqual({
      myObj: {
        foo: {
          bar: 'bar',
        },
      },
    });
  });

  test('unknowns = `ignore` respects local preferences in sub-keys', () => {
    const type = schema.object({
      myObj: schema.object(
        { foo: schema.object({ bar: schema.string() }, { unknowns: 'forbid' }) },
        { unknowns: 'ignore' }
      ),
    });

    expect(() =>
      type.validate({
        myObj: {
          foo: {
            bar: 'bar',
            baz: 'baz',
          },
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(`"[myObj.foo.baz]: definition for this key is missing"`);
  });

  test('parent `allow`, child `ignore` should be honored', () => {
    const type = schema.object(
      {
        myObj: schema.object(
          { foo: schema.string({ defaultValue: 'test' }) },
          { unknowns: 'ignore' }
        ),
      },
      { unknowns: 'allow' }
    );

    expect(
      type.validate({
        myObj: {
          bar: 'baz',
        },
      })
    ).toEqual({
      myObj: {
        foo: 'test',
      },
    });
  });

  describe(`stripUnknownKeys: true in validate`, () => {
    test('should strip unknown keys', () => {
      const type = schema.object({
        myObj: schema.object({
          foo: schema.string({ defaultValue: 'test' }),
          nested: schema.object({
            a: schema.number(),
          }),
        }),
      });

      expect(
        type.validate(
          {
            myObj: {
              bar: 'baz',
              nested: {
                a: 1,
                b: 2,
              },
            },
          },
          void 0,
          void 0,
          { stripUnknownKeys: true }
        )
      ).toStrictEqual({
        myObj: {
          foo: 'test',
          nested: { a: 1 },
        },
      });
    });

    test('should strip unknown keys in object inside record inside map inside object when stripUnkownKeys is true', () => {
      const type = schema.object({
        rootMap: schema.mapOf(
          schema.string(),
          schema.recordOf(
            schema.string(),
            schema.object({
              a: schema.string(),
            })
          )
        ),
      });

      const value = {
        rootMap: new Map([
          [
            'key1',
            {
              record1: { a: '123', b: 'should be stripped' },
              record2: { a: '456', extra: 'remove this' },
            },
          ],
        ]),
        anotherKey: 'should also be stripped',
      };

      const expected = {
        rootMap: new Map([
          [
            'key1',
            {
              record1: { a: '123' },
              record2: { a: '456' },
            },
          ],
        ]),
      };

      expect(type.validate(value, void 0, void 0, { stripUnknownKeys: true })).toStrictEqual(
        expected
      );
    });
  });

  test('should strip unknown keys in object inside record inside map inside object when unknowns is ignore', () => {
    const type = schema.object(
      {
        rootMap: schema.mapOf(
          schema.string(),
          schema.recordOf(
            schema.string(),
            schema.object({
              a: schema.string(),
            })
          )
        ),
      },
      { unknowns: 'ignore' }
    );

    const value = {
      rootMap: new Map([
        [
          'key1',
          {
            record1: { a: '123', b: 'should be stripped' },
            record2: { a: '456', extra: 'remove this' },
          },
        ],
      ]),
      anotherKey: 'should also be stripped',
    };

    const expected = {
      rootMap: new Map([
        [
          'key1',
          {
            record1: { a: '123' },
            record2: { a: '456' },
          },
        ],
      ]),
    };

    expect(type.validate(value, void 0, void 0, {})).toStrictEqual(expected);
  });

  test('should strip unknown keys inside schema.oneOf with stripUnknownKeys for both objects at highest level', () => {
    const type = schema.oneOf([
      schema.object({
        a: schema.string(),
      }),
      schema.object({
        b: schema.string(),
      }),
    ]);

    const value1 = {
      a: 'testA',
      c: 'should be stripped',
    };
    const value2 = {
      b: 'testB',
      d: 'should be stripped',
    };
    const expected1 = {
      a: 'testA',
    };
    const expected2 = {
      b: 'testB',
    };

    expect(type.validate(value1, void 0, void 0, { stripUnknownKeys: true })).toStrictEqual(
      expected1
    );

    expect(type.validate(value2, void 0, void 0, { stripUnknownKeys: true })).toStrictEqual(
      expected2
    );
  });
});

test('handles optional properties', () => {
  const type = schema.object({
    required: schema.string(),
    optional: schema.maybe(schema.string()),
  });

  type SchemaType = TypeOf<typeof type>;

  expectType<SchemaType>({
    required: 'foo',
  });
  expectType<SchemaType>({
    required: 'hello',
    optional: undefined,
  });
  expectType<SchemaType>({
    required: 'hello',
    optional: 'bar',
  });
});

test('handles lazy schemas', () => {
  const lazySchema = () => schema.object({ foo: schema.string() });
  type SchemaType = TypeOf<typeof lazySchema>;
  expectType<SchemaType>({
    foo: 'bar',
  });
});

describe('#extends', () => {
  it('allows to extend an existing schema by adding new properties', () => {
    const origin = schema.object({
      initial: schema.string(),
    });

    const extended = origin.extends({
      added: schema.number(),
    });

    expect(() => {
      extended.validate({ initial: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[added]: expected value of type [number] but got [undefined]"`
    );

    expect(() => {
      extended.validate({ initial: 'foo', added: 42 });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      added: 12,
      initial: 'foo',
    });
  });

  it('allows to extend an existing schema by removing properties', () => {
    const origin = schema.object({
      string: schema.string(),
      number: schema.number(),
    });

    const extended = origin.extends({ number: undefined });

    expect(() => {
      extended.validate({ string: 'foo', number: 12 });
    }).toThrowErrorMatchingInlineSnapshot(`"[number]: definition for this key is missing"`);

    expect(() => {
      extended.validate({ string: 'foo' });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      string: 'foo',
    });
  });

  it('allows to extend an existing schema by overriding an existing properties', () => {
    const origin = schema.object({
      string: schema.string(),
      mutated: schema.number(),
    });

    const extended = origin.extends({
      mutated: schema.string(),
    });

    expect(() => {
      extended.validate({ string: 'foo', mutated: 12 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[mutated]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      extended.validate({ string: 'foo', mutated: 'bar' });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      string: 'foo',
      mutated: 'bar',
    });
  });

  it('properly infer the type from optional properties', () => {
    const origin = schema.object({
      original: schema.maybe(schema.string()),
      mutated: schema.maybe(schema.number()),
      removed: schema.maybe(schema.string()),
    });

    const extended = origin.extends({
      removed: undefined,
      mutated: schema.string(),
    });

    expect(() => {
      extended.validate({ original: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[mutated]: expected value of type [string] but got [undefined]"`
    );
    expect(() => {
      extended.validate({ original: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[mutated]: expected value of type [string] but got [undefined]"`
    );
    expect(() => {
      extended.validate({ original: 'foo', mutated: 'bar' });
    }).not.toThrowError();

    expectType<TypeOf<typeof extended>>({
      original: 'foo',
      mutated: 'bar',
    });
    expectType<TypeOf<typeof extended>>({
      mutated: 'bar',
    });
  });

  it(`allows to override the original schema's options`, () => {
    const origin = schema.object(
      {
        initial: schema.string(),
      },
      { defaultValue: { initial: 'foo' } }
    );

    const extended = origin.extends(
      {
        added: schema.number(),
      },
      { defaultValue: { initial: 'bar', added: 42 } }
    );

    expect(extended.validate(undefined)).toEqual({ initial: 'bar', added: 42 });
  });
});

test('returns schema structure', () => {
  // This test covers different schema types that may or may not be nested
  const objSchema = schema.object({
    any: schema.any(),
    array: schema.arrayOf(schema.string()),
    boolean: schema.boolean(),
    buffer: schema.buffer(),
    byteSize: schema.byteSize(),
    svlConditional: offeringBasedSchema({
      serverless: schema.literal('serverless'),
      traditional: schema.literal('stateful'),
    }),
    conditional: schema.conditional(
      schema.contextRef('context_value_1'),
      schema.contextRef('context_value_2'),
      schema.string(),
      schema.string()
    ),
    duration: schema.duration(),
    ip: schema.ip(),
    literal: schema.literal('foo'),
    map: schema.mapOf(schema.string(), schema.string()),
    maybe: schema.maybe(schema.string()),
    never: schema.never(),
    nullable: schema.nullable(schema.string()),
    number: schema.number(),
    record: schema.recordOf(schema.string(), schema.string()),
    stream: schema.stream(),
    string: schema.string(),
    union: schema.oneOf([schema.string(), schema.number(), schema.boolean()]),
    uri: schema.uri(),
    null: schema.literal(null),
  });
  const type = objSchema.extends({
    nested: objSchema,
  });
  expect(type.getSchemaStructure()).toEqual([
    { path: ['any'], type: 'any' },
    { path: ['array'], type: 'array' },
    { path: ['boolean'], type: 'boolean' },
    { path: ['buffer'], type: 'binary' },
    { path: ['byteSize'], type: 'bytes' },
    { path: ['svlConditional'], type: 'serverless|stateful' },
    { path: ['conditional'], type: 'string' },
    { path: ['duration'], type: 'duration' },
    { path: ['ip'], type: 'string' },
    { path: ['literal'], type: 'foo' },
    { path: ['map'], type: 'map' },
    { path: ['maybe'], type: 'string?' },
    { path: ['never'], type: 'never' },
    { path: ['nullable'], type: 'string?|null' },
    { path: ['number'], type: 'number' },
    { path: ['record'], type: 'record' },
    { path: ['stream'], type: 'stream' },
    { path: ['string'], type: 'string' },
    { path: ['union'], type: 'string|number|boolean' },
    { path: ['uri'], type: 'string' },
    { path: ['null'], type: 'null' },
    { path: ['nested', 'any'], type: 'any' },
    { path: ['nested', 'array'], type: 'array' },
    { path: ['nested', 'boolean'], type: 'boolean' },
    { path: ['nested', 'buffer'], type: 'binary' },
    { path: ['nested', 'byteSize'], type: 'bytes' },
    { path: ['nested', 'svlConditional'], type: 'serverless|stateful' },
    { path: ['nested', 'conditional'], type: 'string' },
    { path: ['nested', 'duration'], type: 'duration' },
    { path: ['nested', 'ip'], type: 'string' },
    { path: ['nested', 'literal'], type: 'foo' },
    { path: ['nested', 'map'], type: 'map' },
    { path: ['nested', 'maybe'], type: 'string?' },
    { path: ['nested', 'never'], type: 'never' },
    { path: ['nested', 'nullable'], type: 'string?|null' },
    { path: ['nested', 'number'], type: 'number' },
    { path: ['nested', 'record'], type: 'record' },
    { path: ['nested', 'stream'], type: 'stream' },
    { path: ['nested', 'string'], type: 'string' },
    { path: ['nested', 'union'], type: 'string|number|boolean' },
    { path: ['nested', 'uri'], type: 'string' },
    { path: ['nested', 'null'], type: 'null' },
  ]);
});

describe('#extendsDeep', () => {
  const type = schema.object({ test: schema.object({ foo: schema.string() }) });

  test('objects with unknown attributes are kept when extending with unknowns=allow', () => {
    const allowSchema = type.extendsDeep({ unknowns: 'allow' });
    const result = allowSchema.validate({ test: { foo: 'test', bar: 'test' } });
    expect(result).toEqual({ test: { foo: 'test', bar: 'test' } });
  });

  test('objects with unknown attributes are dropped when extending with unknowns=ignore', () => {
    const ignoreSchema = type.extendsDeep({ unknowns: 'ignore' });
    const result = ignoreSchema.validate({ test: { foo: 'test', bar: 'test' } });
    expect(result).toEqual({ test: { foo: 'test' } });
  });

  test('objects with unknown attributes fail validation when extending with unknowns=forbid', () => {
    const forbidSchema = type.extendsDeep({ unknowns: 'forbid' });
    expect(() =>
      forbidSchema.validate({ test: { foo: 'test', bar: 'test' } })
    ).toThrowErrorMatchingInlineSnapshot(`"[test.bar]: definition for this key is missing"`);
  });
});
