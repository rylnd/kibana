/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiComboBox, EuiComboBoxOptionOption, useEuiTheme, EuiComboBoxProps } from '@elastic/eui';
import React from 'react';
import { genericComboBoxStyle } from './generic_combo_box.styles';

export interface GenericComboBoxProps<T> {
  options: T[];
  selectedOptions: T[];
  getLabel: (value: T) => string;
  onChange: (values: T[]) => void;
  renderOption?: (
    option: EuiComboBoxOptionOption,
    searchValue: string,
    OPTION_CONTENT_CLASSNAME: string
  ) => React.ReactNode;
  inputRef?: ((instance: HTMLInputElement | null) => void) | undefined;
  truncationProps?: EuiComboBoxProps<T>['truncationProps'];
  [propName: string]: any;
}

/**
 * A generic combo box. Instead of accepting a set of options that contain a `label`, it accepts
 * any type of object. It also accepts a `getLabel` function that each object will be sent through
 * to get the label to be passed to the combo box. The `onChange` will trigger with the actual
 * selected objects, rather than an option object.
 */
export function GenericComboBox<T>(props: GenericComboBoxProps<T>) {
  const { options, selectedOptions, getLabel, onChange, ...otherProps } = props;
  const { euiTheme } = useEuiTheme();
  const labels = options.map(getLabel);
  const euiOptions: EuiComboBoxOptionOption[] = labels.map((label) => ({ label }));
  const selectedEuiOptions = selectedOptions
    .filter((option) => {
      return options.indexOf(option) !== -1;
    })
    .map((option) => {
      return euiOptions[options.indexOf(option)];
    });

  const onComboBoxChange = (newOptions: EuiComboBoxOptionOption[]) => {
    const newValues = newOptions.map(({ label }) => {
      return options[labels.indexOf(label)];
    });
    onChange(newValues);
  };

  return (
    <EuiComboBox
      options={euiOptions}
      className={genericComboBoxStyle(euiTheme)}
      selectedOptions={selectedEuiOptions}
      onChange={onComboBoxChange}
      sortMatchesBy="startsWith"
      {...otherProps}
    />
  );
}
