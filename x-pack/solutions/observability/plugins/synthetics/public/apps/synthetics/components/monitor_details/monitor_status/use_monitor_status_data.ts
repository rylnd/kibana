/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import useDebounce from 'react-use/lib/useDebounce';
import { useLocation } from 'react-router-dom';

import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';

import { useSelectedMonitor } from '../hooks/use_selected_monitor';
import {
  dateToMilli,
  createTimeBuckets,
  CHART_CELL_WIDTH,
  indexBinsByEndTime,
  MonitorStatusPanelProps,
  createStatusTimeBins,
  MonitorStatusTimeBin,
} from './monitor_status_data';
import { useSelectedLocation } from '../hooks/use_selected_location';
import {
  clearMonitorStatusHeatmapAction,
  quietGetMonitorStatusHeatmapAction,
  selectHeatmap,
} from '../../../state/status_heatmap';
import type { MonitorStatusHeatmapBucket } from '../../../../../../common/runtime_types';

type Props = Pick<MonitorStatusPanelProps, 'from' | 'to'> & {
  initialSizeRef?: React.MutableRefObject<HTMLDivElement | null>;
};

export const useMonitorStatusData = ({ from, to, initialSizeRef }: Props) => {
  const { lastRefresh } = useSyntheticsRefreshContext();
  const { monitor } = useSelectedMonitor();
  const location = useSelectedLocation();
  const pageLocation = useLocation();

  const fromMillis = dateToMilli(from);
  const toMillis = dateToMilli(to);
  const totalMinutes = Math.ceil(toMillis - fromMillis) / (1000 * 60);

  const [binsAvailableByWidth, setBinsAvailableByWidth] = useState<number | null>(null);
  const [debouncedBinsCount, setDebouncedCount] = useState<number | null>(null);

  const minsPerBin =
    debouncedBinsCount !== null ? Math.floor(totalMinutes / debouncedBinsCount) : null;

  const dispatch = useDispatch();
  const { heatmap: dateHistogram, loading } = useSelector(selectHeatmap);

  const getBinsNo = useCallback(
    (maxNoOfBins: number) => {
      // Each bin represents a time interval of at least 1 minute. If the available width allows for more bins
      // than there are minutes in the time range, we cap the number of bins to match the number of minutes
      // to ensure each bin represents a meaningful time interval.
      return Math.min(maxNoOfBins, totalMinutes);
    },
    [totalMinutes]
  );

  useEffect(() => {
    if (binsAvailableByWidth === null && initialSizeRef?.current) {
      setBinsAvailableByWidth(
        getBinsNo(Math.floor(initialSizeRef?.current?.clientWidth / CHART_CELL_WIDTH))
      );
    }
  }, [binsAvailableByWidth, initialSizeRef, getBinsNo]);

  useEffect(() => {
    if (monitor?.id && location?.label && debouncedBinsCount !== null && !!minsPerBin) {
      dispatch(
        quietGetMonitorStatusHeatmapAction.get({
          monitorId: monitor.id,
          location: location.label,
          from,
          to,
          interval: minsPerBin,
        })
      );
    }
  }, [
    dispatch,
    from,
    to,
    minsPerBin,
    location?.label,
    monitor?.id,
    lastRefresh,
    debouncedBinsCount,
  ]);

  useEffect(() => {
    dispatch(clearMonitorStatusHeatmapAction());
  }, [dispatch, pageLocation.pathname]);

  const handleResize = useCallback(
    (e: { width: number; height: number }) =>
      setBinsAvailableByWidth(getBinsNo(Math.floor(e.width / CHART_CELL_WIDTH))),
    [getBinsNo]
  );

  useDebounce(
    () => {
      setDebouncedCount(binsAvailableByWidth === 0 ? null : binsAvailableByWidth);
    },
    500,
    [binsAvailableByWidth]
  );

  const { timeBins, timeBinMap, xDomain } = useBins({
    fromMillis,
    toMillis,
    dateHistogram,
    minsPerBin,
  });

  return {
    loading,
    minsPerBin,
    timeBins,
    getTimeBinByXValue: (xValue: number | undefined) =>
      xValue === undefined ? undefined : timeBinMap.get(xValue),
    xDomain,
    handleResize,
  };
};

export const useBins = ({
  minsPerBin,
  fromMillis,
  toMillis,
  dateHistogram,
}: {
  minsPerBin: number | null;
  fromMillis: number;
  toMillis: number;
  dateHistogram?: MonitorStatusHeatmapBucket[];
}) =>
  useMemo((): {
    timeBins: MonitorStatusTimeBin[];
    timeBinMap: Map<number, MonitorStatusTimeBin>;
    xDomain: { min: number; max: number };
  } => {
    if (minsPerBin === null) {
      return {
        timeBins: [],
        timeBinMap: new Map(),
        xDomain: {
          min: fromMillis,
          max: toMillis,
        },
      };
    }
    const timeBuckets = createTimeBuckets(minsPerBin ?? 50, fromMillis, toMillis);
    const bins = createStatusTimeBins(timeBuckets, dateHistogram);
    return {
      timeBins: bins,
      timeBinMap: indexBinsByEndTime(bins),
      xDomain: {
        min: bins?.[0]?.end ?? fromMillis,
        max: bins?.at(-1)?.end ?? toMillis,
      },
    };
  }, [minsPerBin, fromMillis, toMillis, dateHistogram]);
