/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as helpers from '../helpers';

export const validationStatsCommandTestSuite = (setup: helpers.Setup) => {
  describe('validation', () => {
    describe('command', () => {
      describe('STATS <aggregates> [ BY <grouping> ]', () => {
        test('no errors on correct usage', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from a_index | stats by textField', []);
          await expectErrors(
            `FROM index
            | EVAL doubleField * 3.281
            | STATS avg_doubleField = AVG(\`doubleField * 3.281\`)`,
            []
          );
          await expectErrors(
            `FROM index | STATS AVG(doubleField) by round(doubleField) + 1 | EVAL \`round(doubleField) + 1\` / 2`,
            []
          );
        });

        test('errors on invalid command start', async () => {
          const { expectErrors } = await setup();

          await expectErrors('from a_index | stats ', [
            'At least one aggregation or grouping expression required in [STATS]',
          ]);
        });

        describe('... <aggregates> ...', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats avg(doubleField) by 1', []);
            await expectErrors('from a_index | stats count(`doubleField`)', []);
            await expectErrors('from a_index | stats count(*)', []);
            await expectErrors('from a_index | stats count()', []);
            await expectErrors('from a_index | stats col0 = count(*)', []);
            await expectErrors('from a_index | stats col0 = count()', []);
            await expectErrors('from a_index | stats col0 = avg(doubleField), count(*)', []);
            await expectErrors(`from a_index | stats sum(case(false, 0, 1))`, []);
            await expectErrors(`from a_index | stats col0 = sum( case(false, 0, 1))`, []);
            await expectErrors('from a_index | stats ??func(doubleField)', []);
            await expectErrors('from a_index | stats avg(??field)', []);

            // "or" must accept "null"
            await expectErrors('from a_index | stats count(textField == "a" or null)', []);
          });

          test('sub-command can reference aggregated field', async () => {
            const { expectErrors } = await setup();

            for (const subCommand of ['keep', 'drop', 'eval']) {
              await expectErrors(
                'from a_index | stats count(`doubleField`) | ' +
                  subCommand +
                  ' `count(``doubleField``)` ',
                []
              );
            }
          });

          test('errors on agg and non-agg mix', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | STATS sum( doubleField ) + abs( doubleField ) ', [
              'Cannot combine aggregation and non-aggregation values in [STATS], found [sum(doubleField)+abs(doubleField)]',
            ]);
            await expectErrors('from a_index | STATS abs( doubleField + sum( doubleField )) ', [
              'Cannot combine aggregation and non-aggregation values in [STATS], found [abs(doubleField+sum(doubleField))]',
            ]);
          });

          test('errors on each aggregation field, which does not contain at least one agg function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats doubleField + 1', [
              'At least one aggregation function required in [STATS], found [doubleField+1]',
            ]);
            await expectErrors('from a_index | stats doubleField + 1, textField', [
              'At least one aggregation function required in [STATS], found [doubleField+1]',
              'Expected an aggregate function or group but got [textField] of type [FieldAttribute]',
            ]);
            await expectErrors('from a_index | stats doubleField + 1, doubleField + 2, count()', [
              'At least one aggregation function required in [STATS], found [doubleField+1]',
              'At least one aggregation function required in [STATS], found [doubleField+2]',
            ]);
            await expectErrors(
              'from a_index | stats doubleField + 1, doubleField + count(), count()',
              ['At least one aggregation function required in [STATS], found [doubleField+1]']
            );
            await expectErrors('from a_index | stats 5 + doubleField + 1', [
              'At least one aggregation function required in [STATS], found [5+doubleField+1]',
            ]);
            await expectErrors('from a_index | stats doubleField + 1 by ipField', [
              'At least one aggregation function required in [STATS], found [doubleField+1]',
            ]);
          });

          test('errors when input is not an aggregate function', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats doubleField ', [
              'Expected an aggregate function or group but got [doubleField] of type [FieldAttribute]',
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats doubleField=', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'not', 'null', '?', 'true', '+', '-', '??', NAMED_OR_POSITIONAL_PARAM, NAMED_OR_POSITIONAL_DOUBLE_PARAMS, '[', '(', UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('from a_index | stats doubleField=5 by ', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'not', 'null', '?', 'true', '+', '-', '??', NAMED_OR_POSITIONAL_PARAM, NAMED_OR_POSITIONAL_DOUBLE_PARAMS, '[', '(', UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
            await expectErrors('from a_index | stats avg(doubleField) by wrongField', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | stats avg(doubleField) by wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | stats avg(doubleField) by col0 = wrongField + 1', [
              'Unknown column [wrongField]',
            ]);
            await expectErrors('from a_index | stats col0 = avg(fn(number)), count(*)', [
              'Unknown function [fn]',
            ]);
          });

          test('semantic errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats count(round(*))', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('from a_index | stats count(count(*))', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });

          test('allows WHERE clause', async () => {
            const { expectErrors } = await setup();

            await expectErrors('FROM a_index | STATS col0 = avg(doubleField) WHERE 123', []);
          });
        });

        describe('... BY <grouping>', () => {
          test('no errors on correct usage', async () => {
            const { expectErrors } = await setup();

            await expectErrors(
              'from a_index | stats avg(doubleField), percentile(doubleField, 50) by ipField',
              []
            );
            await expectErrors(
              'from a_index | stats avg(doubleField), percentile(doubleField, 50) BY ipField',
              []
            );
            await expectErrors(
              'from a_index | stats avg(doubleField), percentile(doubleField, 50) + 1 by ipField',
              []
            );
            await expectErrors('from a_index | stats avg(doubleField) by ??field', []);
            for (const op of ['+', '-', '*', '/', '%']) {
              await expectErrors(
                `from a_index | stats avg(doubleField) ${op} percentile(doubleField, 50) BY ipField`,
                []
              );
            }
          });

          test('cannot specify <grouping> without <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats by ', [
              "SyntaxError: mismatched input '<EOF>' expecting {QUOTED_STRING, INTEGER_LITERAL, DECIMAL_LITERAL, 'false', 'not', 'null', '?', 'true', '+', '-', '??', NAMED_OR_POSITIONAL_PARAM, NAMED_OR_POSITIONAL_DOUBLE_PARAMS, '[', '(', UNQUOTED_IDENTIFIER, QUOTED_IDENTIFIER}",
            ]);
          });

          test('syntax errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats count(* + 1) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
            await expectErrors('from a_index | stats count(* + round(doubleField)) BY ipField', [
              "SyntaxError: no viable alternative at input 'count(* +'",
            ]);
          });

          test('semantic errors in <aggregates>', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats count(round(*)) BY ipField', [
              'Using wildcards (*) in round is not allowed',
            ]);
            await expectErrors('from a_index | stats count(count(*)) BY ipField', [
              `Aggregate function's parameters must be an attribute, literal or a non-aggregation function; found [count(*)] of type [long]`,
            ]);
          });

          test('various errors', async () => {
            const { expectErrors } = await setup();

            await expectErrors('from a_index | stats avg(doubleField) by percentile(doubleField)', [
              'STATS BY does not support function percentile',
            ]);
            await expectErrors(
              'from a_index | stats avg(doubleField) by textField, percentile(doubleField) by ipField',
              [
                "SyntaxError: mismatched input 'by' expecting <EOF>",
                'STATS BY does not support function percentile',
              ]
            );
          });

          describe('constant-only parameters', () => {
            test('no errors', async () => {
              const { expectErrors } = await setup();

              await expectErrors(
                'from index | stats by bucket(dateField, 1 + 30 / 10, "", "")',
                []
              );
              await expectErrors(
                'from index | stats by bucket(dateField, 1 + 30 / 10, concat("", ""), "")',
                []
              );
            });

            test('errors', async () => {
              const { expectErrors } = await setup();

              await expectErrors('from index | stats by bucket(dateField, pi(), "", "")', [
                'Argument of [bucket] must be [integer], found value [pi()] type [double]',
              ]);

              await expectErrors(
                'from index | stats by bucket(dateField, abs(doubleField), "", "")',
                ['Argument of [bucket] must be a constant, received [abs(doubleField)]']
              );
              await expectErrors(
                'from index | stats by bucket(dateField, abs(length(doubleField)), "", "")',
                ['Argument of [bucket] must be a constant, received [abs(length(doubleField))]']
              );
              await expectErrors(
                'from index | stats by bucket(dateField, doubleField, textField, textField)',
                [
                  'Argument of [bucket] must be a constant, received [doubleField]',
                  'Argument of [bucket] must be a constant, received [textField]',
                  'Argument of [bucket] must be a constant, received [textField]',
                ]
              );
            });
          });
        });

        describe('nesting', () => {
          const NESTING_LEVELS = 4;
          const NESTED_DEPTHS = Array(NESTING_LEVELS)
            .fill(0)
            .map((_, i) => i + 1);

          for (const nesting of NESTED_DEPTHS) {
            describe(`depth = ${nesting}`, () => {
              describe('operators', () => {
                const operatorsWrapping = Array(nesting).fill('+1').join('');

                test('no errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | stats 5 + avg(doubleField) ${operatorsWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats 5 ${operatorsWrapping} + avg(doubleField)`,
                    []
                  );
                });

                test('errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(`from a_index | stats 5 ${operatorsWrapping} + doubleField`, [
                    `At least one aggregation function required in [STATS], found [5${operatorsWrapping}+doubleField]`,
                  ]);
                  await expectErrors(`from a_index | stats 5 + doubleField ${operatorsWrapping}`, [
                    `At least one aggregation function required in [STATS], found [5+doubleField${operatorsWrapping}]`,
                  ]);
                  await expectErrors(
                    `from a_index | stats 5 + doubleField ${operatorsWrapping}, col0 = sum(doubleField)`,
                    [
                      `At least one aggregation function required in [STATS], found [5+doubleField${operatorsWrapping}]`,
                    ]
                  );
                });
              });

              describe('EVAL', () => {
                const evalWrapping = Array(nesting).fill('round(').join('');
                const closingWrapping = Array(nesting).fill(')').join('');

                test('no errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(doubleField) ${closingWrapping} + ${evalWrapping} sum(doubleField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(doubleField + doubleField) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping} + ${evalWrapping} sum(doubleField + round(doubleField)) ${closingWrapping}`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats sum(${evalWrapping} doubleField ${closingWrapping} )`,
                    []
                  );
                  await expectErrors(
                    `from a_index | stats sum(${evalWrapping} doubleField ${closingWrapping} ) + sum(${evalWrapping} doubleField ${closingWrapping} )`,
                    []
                  );
                });

                test('errors', async () => {
                  const { expectErrors } = await setup();

                  await expectErrors(
                    `from a_index | stats ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | stats ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}, col0 = sum(doubleField)`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                    ]
                  );
                  await expectErrors(
                    `from a_index | stats col0 = ${evalWrapping} doubleField + sum(doubleField) ${closingWrapping}, col1 = sum(doubleField)`,
                    [
                      `Cannot combine aggregation and non-aggregation values in [STATS], found [${evalWrapping}doubleField+sum(doubleField)${closingWrapping}]`,
                    ]
                  );
                });
              });
            });
          }
        });
      });
    });
  });
};
