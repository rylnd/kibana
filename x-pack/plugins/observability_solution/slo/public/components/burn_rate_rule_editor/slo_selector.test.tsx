/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { emptySloList } from '../../data/slo/slo';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { render } from '../../utils/test_helper';
import { SloSelector } from './slo_selector';

jest.mock('../../hooks/use_fetch_slo_definitions');

const useFetchSloDefinitionsMock = useFetchSloDefinitions as jest.Mock;

describe('SLO Selector', () => {
  const onSelectedSpy = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    useFetchSloDefinitionsMock.mockReturnValue({ isLoading: true, data: emptySloList });
  });

  it('fetches SLOs asynchronously', async () => {
    render(<SloSelector onSelected={onSelectedSpy} />);

    expect(screen.getByTestId('sloSelector')).toBeTruthy();
    expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: '' });
  });

  it('searches SLOs when typing', async () => {
    render(<SloSelector onSelected={onSelectedSpy} />);

    const input = screen.getByTestId('comboBoxInput');
    await userEvent.type(input, 'latency', { delay: 1 });

    await waitFor(() =>
      expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: 'latency' })
    );

    expect(useFetchSloDefinitionsMock).toHaveBeenCalledWith({ name: 'latency' });
  });
});
