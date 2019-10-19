/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiPanel, EuiSelect, EuiTabs, EuiTab } from '@elastic/eui';

import { isImportRepositoryURLInvalid } from '../../utils/url';
import { ImportForm } from './import_form';

export interface Props {
  onRepoSelect: (repo: string) => void;
  onImportSuccess: (repo: string) => void;
  repos: string[];
}

enum Tab {
  importNew,
  selectExisting,
}

const importStub: (repo: string) => Promise<string> = repo =>
  new Promise(resolve => setTimeout(() => resolve(repo), 5000));

export const CodeIntegratorPanel = ({ onRepoSelect, onImportSuccess, repos }: Props) => {
  const [selectedTab, selectTab] = useState<Tab>(Tab.importNew);
  const [newRepo, setNewRepo] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);
  const options = repos.map(repo => ({ value: repo, text: repo }));
  const [selectedRepo, setSelectedRepo] = useState(options[0].value);

  const handleNewRepoChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setIsInvalid(isImportRepositoryURLInvalid(value));
    setNewRepo(value);
  };

  const handleRepoChange = ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) =>
    setSelectedRepo(value);

  const handleNewRepoSubmit = () => {
    onRepoSelect(newRepo);
    importStub(newRepo).then(onImportSuccess);
  };

  const handleRepoSubmit = () => onRepoSelect(selectedRepo);

  const tabContent =
    selectedTab === Tab.importNew ? (
      <ImportForm
        value={newRepo}
        isInvalid={isInvalid}
        onChange={handleNewRepoChange}
        onSubmit={handleNewRepoSubmit}
      />
    ) : (
      <>
        <EuiSelect options={options} value={selectedRepo} onChange={handleRepoChange} />
        <EuiButton onClick={handleRepoSubmit}>
          <FormattedMessage
            id="xpack.code.integrationsPanel.repoSubmitLabel"
            defaultMessage="Create mapping"
          />
        </EuiButton>
      </>
    );

  return (
    <EuiPanel>
      <EuiTabs>
        <EuiTab onClick={() => selectTab(Tab.importNew)} isSelected={selectedTab === Tab.importNew}>
          <FormattedMessage
            id="xpack.code.integratorPanel.importTabTitle"
            defaultMessage="Import new"
          />
        </EuiTab>
        <EuiTab
          onClick={() => selectTab(Tab.selectExisting)}
          isSelected={selectedTab === Tab.selectExisting}
        >
          <FormattedMessage
            id="xpack.code.integratorPanel.chooseExistingTabTitle"
            defaultMessage="Choose existing"
          />
        </EuiTab>
      </EuiTabs>
      <div className="codeIntegrations__tabContent">{tabContent}</div>
    </EuiPanel>
  );
};
