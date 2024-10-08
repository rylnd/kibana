/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import immutable from 'object-path-immutable';

const { set, del } = immutable;

export const transientReducer = handleActions(
  {
    // clear all the resolved args when restoring the history
    // TODO: we shouldn't need to reset the resolved args for history
    ['restoreHistory']: (transientState) => set(transientState, 'resolvedArgs', {}),

    ['removeElements']: (transientState, { payload: { elementIds } }) => {
      const { selectedToplevelNodes } = transientState;
      return del(
        {
          ...transientState,
          selectedToplevelNodes: selectedToplevelNodes.filter((n) => elementIds.indexOf(n) < 0),
        },
        ['resolvedArgs', elementIds]
      );
    },

    ['setFirstLoad']: (transientState, { payload }) => {
      return set(transientState, 'isFirstLoad', Boolean(payload));
    },

    ['setFullscreen']: (transientState, { payload }) => {
      return set(transientState, 'fullscreen', Boolean(payload));
    },

    ['setElementStats']: (transientState, { payload }) => {
      return set(transientState, 'elementStats', payload);
    },

    ['selectToplevelNodes']: (transientState, { payload }) => {
      return {
        ...transientState,
        selectedToplevelNodes: payload,
      };
    },

    ['setZoomScale']: (transientState, { payload }) => {
      return {
        ...transientState,
        zoomScale: payload || 1,
      };
    },

    ['setPage']: (transientState) => {
      return { ...transientState, selectedToplevelNodes: [] };
    },

    ['addPage']: (transientState) => {
      return { ...transientState, selectedToplevelNodes: [] };
    },

    ['duplicatePage']: (transientState) => {
      return { ...transientState, selectedToplevelNodes: [] };
    },

    ['setRefreshInterval']: (transientState, { payload }) => {
      return { ...transientState, refresh: { interval: Number(payload) || 0 } };
    },

    ['enableAutoplay']: (transientState, { payload }) => {
      return set(transientState, 'autoplay.enabled', Boolean(payload) || false);
    },

    ['setAutoplayInterval']: (transientState, { payload }) => {
      return set(transientState, 'autoplay.interval', Number(payload) || 0);
    },
  },
  {}
);
