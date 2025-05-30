/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, keyframes } from '@emotion/react';
import { Observable } from 'rxjs';
import React, { Fragment, FC, useLayoutEffect, useRef, useState, MutableRefObject } from 'react';
import { EuiLoadingElastic, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import { APP_WRAPPER_CLASS } from '@kbn/core-application-common';
import {
  AppStatus,
  type AppLeaveHandler,
  type AppUnmount,
  type ScopedHistory,
} from '@kbn/core-application-browser';
import { ThrowIfError } from '@kbn/shared-ux-error-boundary';
import type { Mounter } from '../types';
import { AppNotFound } from './app_not_found_screen';

interface Props {
  /** Path application is mounted on without the global basePath */
  appPath: string;
  appId: string;
  mounter?: Mounter;
  theme$: Observable<CoreTheme>;
  appStatus: AppStatus;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
  setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
  createScopedHistory: (appUrl: string) => ScopedHistory;
  setIsMounting: (isMounting: boolean) => void;
  showPlainSpinner?: boolean;
}

export const AppContainer: FC<Props> = ({
  mounter,
  appId,
  appPath,
  setAppLeaveHandler,
  setAppActionMenu,
  createScopedHistory,
  appStatus,
  setIsMounting,
  theme$,
  showPlainSpinner,
}: Props) => {
  const [error, setError] = useState<Error | null>(null);
  const [showSpinner, setShowSpinner] = useState(true);
  const [appNotFound, setAppNotFound] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef: MutableRefObject<AppUnmount | null> = useRef<AppUnmount>(null);

  useLayoutEffect(() => {
    const unmount = () => {
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };

    if (!mounter || appStatus !== AppStatus.accessible) {
      return setAppNotFound(true);
    }
    setAppNotFound(false);

    setIsMounting(true);
    if (mounter.unmountBeforeMounting) {
      unmount();
    }

    const mount = async () => {
      setShowSpinner(true);
      try {
        unmountRef.current =
          (await mounter.mount({
            appBasePath: mounter.appBasePath,
            history: createScopedHistory(appPath),
            element: elementRef.current!,
            theme$,
            onAppLeave: (handler) => setAppLeaveHandler(appId, handler),
            setHeaderActionMenu: (menuMount) => setAppActionMenu(appId, menuMount),
          })) || null;
      } catch (e) {
        setError(e);
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        if (elementRef.current) {
          setShowSpinner(false);
        }
        setIsMounting(false);
      }
    };

    mount();

    return unmount;
  }, [
    appId,
    appStatus,
    mounter,
    createScopedHistory,
    setAppLeaveHandler,
    setAppActionMenu,
    appPath,
    setIsMounting,
    theme$,
  ]);

  return (
    <Fragment>
      <ThrowIfError error={error} />
      {appNotFound && <AppNotFound />}
      {showSpinner && !appNotFound && (
        <AppLoadingPlaceholder showPlainSpinner={Boolean(showPlainSpinner)} />
      )}
      <div className={APP_WRAPPER_CLASS} key={appId} ref={elementRef} aria-busy={showSpinner} />
    </Fragment>
  );
};

const AppLoadingPlaceholder: FC<{ showPlainSpinner: boolean }> = ({ showPlainSpinner }) => {
  const { euiTheme } = useEuiTheme();
  const appContainerFadeIn = keyframes({
    '0%': { opacity: 0 },
    '50%': { opacity: 0 },
    '100%': { opacity: 1 },
  });
  const appContainerStyles = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: euiTheme.levels.header,
    animationName: appContainerFadeIn,
    animationIterationCount: 1,
    animationTimingFunction: 'ease-in',
    animationDuration: '2s',
  });

  if (showPlainSpinner) {
    return (
      <EuiLoadingSpinner
        size={'xxl'}
        css={appContainerStyles}
        data-test-subj="appContainer-loadingSpinner"
        aria-label={i18n.translate('core.application.appContainer.plainSpinner.loadingAriaLabel', {
          defaultMessage: 'Loading application',
        })}
      />
    );
  }
  return (
    <EuiLoadingElastic
      css={appContainerStyles}
      aria-label={i18n.translate('core.application.appContainer.loadingAriaLabel', {
        defaultMessage: 'Loading application',
      })}
      size="xxl"
    />
  );
};
