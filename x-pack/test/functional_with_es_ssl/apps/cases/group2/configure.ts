/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '@kbn/cases-plugin/common/types/domain';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const toasts = getService('toasts');
  const header = getPageObject('header');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');

  describe('Configure', function () {
    before(async () => {
      await cases.navigation.navigateToConfigurationPage();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    describe('Closure options', function () {
      this.beforeEach(async () => {
        await header.waitUntilLoadingHasFinished();
      });

      it('defaults the closure option correctly', async () => {
        await cases.common.assertRadioGroupValue('closure-options-radio-group', 'close-by-user');
      });

      it('change closure option successfully', async () => {
        await cases.common.selectRadioGroupValue('closure-options-radio-group', 'close-by-pushing');
        const toast = await toasts.getElementByIndex(1);
        expect(await toast.getVisibleText()).to.be('Settings successfully updated');
        await toasts.dismissAll();
        await cases.common.assertRadioGroupValue('closure-options-radio-group', 'close-by-pushing');
      });
    });

    describe('Connectors', function () {
      it('defaults the connector to none correctly', async () => {
        expect(await testSubjects.exists('dropdown-connector-no-connector-label')).to.be(true);
      });

      it('opens and closes the connectors flyout correctly', async () => {
        await common.clickAndValidate('add-new-connector', 'euiFlyoutCloseButton');
        await testSubjects.click('euiFlyoutCloseButton');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);
      });
    });

    describe('Custom fields', function () {
      before(async () => {
        await cases.api.createConfigWithCustomFields({
          customFields: [
            {
              key: 'o11y_custom_field',
              label: 'My o11y field',
              type: CustomFieldTypes.TOGGLE,
              required: false,
            },
          ],
          owner: 'observability',
        });
      });

      it('existing configurations do not interfere', async () => {
        // A configuration created in o11y should not be visible in stack
        expect(await testSubjects.getVisibleText('empty-custom-fields')).to.be(
          'You do not have any fields yet'
        );
      });

      it('adds a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        await common.clickAndValidate('add-custom-field', 'common-flyout');

        await testSubjects.setValue('custom-field-label-input', 'Summary');

        await testSubjects.setCheckbox('text-custom-field-required-wrapper', 'check');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Summary\nText');
      });

      it('edits a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const textField = await find.byCssSelector('[data-test-subj*="-custom-field-edit"]');

        await textField.click();

        const input = await testSubjects.find('custom-field-label-input');

        await input.type('!!!');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Summary!!!\nText');
      });

      it('deletes a custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const deleteButton = await find.byCssSelector('[data-test-subj*="-custom-field-delete"]');

        await deleteButton.click();

        await testSubjects.existOrFail('confirm-delete-modal');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.missingOrFail('custom-fields-list');
      });

      it('adds a number custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        await common.clickAndValidate('add-custom-field', 'common-flyout');

        await testSubjects.setValue('custom-field-label-input', 'Count');
        await testSubjects.click('custom-field-type-selector');
        await (await find.byCssSelector('[value="number"]')).click();
        await testSubjects.setCheckbox('number-custom-field-required-wrapper', 'check');

        const defaultNumberInput = await testSubjects.find('number-custom-field-default-value');
        await defaultNumberInput.type('0');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Count\nNumber');
      });

      it('edits a number custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const numberField = await find.byCssSelector('[data-test-subj*="-custom-field-edit"]');

        await numberField.click();

        const labelInput = await testSubjects.find('custom-field-label-input');
        await labelInput.type('!');

        await testSubjects.setValue('number-custom-field-default-value', '321');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await testSubjects.existOrFail('custom-fields-list');

        expect(await testSubjects.getVisibleText('custom-fields-list')).to.be('Count!\nNumber');
      });

      it('deletes a number custom field', async () => {
        await testSubjects.existOrFail('custom-fields-form-group');
        const deleteButton = await find.byCssSelector('[data-test-subj*="-custom-field-delete"]');

        await deleteButton.click();

        await testSubjects.existOrFail('confirm-delete-modal');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.missingOrFail('custom-fields-list');
      });
    });

    describe('Templates', function () {
      before(async () => {
        await cases.api.createConfigWithTemplates({
          templates: [
            {
              key: 'o11y_template',
              name: 'My template 1',
              description: 'this is my first template',
              tags: ['foo'],
              caseFields: null,
            },
          ],
          owner: 'observability',
        });
      });

      it('existing configurations do not interfere', async () => {
        // A configuration created in o11y should not be visible in stack
        expect(await testSubjects.getVisibleText('empty-templates')).to.be(
          'You do not have any templates yet'
        );
      });

      it('adds a template', async () => {
        await testSubjects.existOrFail('templates-form-group');
        await common.clickAndValidate('add-template', 'common-flyout');

        await testSubjects.setValue('template-name-input', 'Template name');
        await comboBox.setCustom('template-tags', 'tag-t1');
        await testSubjects.setValue('template-description-input', 'Template description');

        const caseTitle = await find.byCssSelector(
          `[data-test-subj="input"][aria-describedby="caseTitle"]`
        );
        await caseTitle.focus();
        await caseTitle.type('case with template');

        await cases.create.setDescription('test description');

        await cases.create.setTags('tagme');
        await cases.create.setCategory('new');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await retry.waitFor('templates-list', async () => {
          return await testSubjects.exists('templates-list');
        });

        expect(await testSubjects.getVisibleText('templates-list')).to.be('Template name\ntag-t1');
      });

      it('updates a template', async () => {
        await testSubjects.existOrFail('templates-form-group');
        const editButton = await find.byCssSelector('[data-test-subj*="-template-edit"]');

        await editButton.click();

        await testSubjects.setValue('template-name-input', 'Updated template name!');
        await comboBox.setCustom('template-tags', 'tag-t1');
        await testSubjects.setValue('template-description-input', 'Template description updated');

        const caseTitle = await find.byCssSelector(
          `[data-test-subj="input"][aria-describedby="caseTitle"]`
        );
        await caseTitle.focus();
        await caseTitle.type('!!');

        await cases.create.setDescription('test description!!');

        await cases.create.setTags('case-tag');
        await cases.create.setCategory('new!');

        await testSubjects.click('common-flyout-save');
        expect(await testSubjects.exists('euiFlyoutCloseButton')).to.be(false);

        await retry.waitFor('templates-list', async () => {
          return await testSubjects.exists('templates-list');
        });

        expect(await testSubjects.getVisibleText('templates-list')).to.be(
          'Updated template name!\ntag-t1'
        );
      });

      it('deletes a template', async () => {
        await testSubjects.existOrFail('templates-form-group');
        const deleteButton = await find.byCssSelector('[data-test-subj*="-template-delete"]');

        await deleteButton.click();

        await testSubjects.existOrFail('confirm-delete-modal');

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.missingOrFail('template-list');
      });
    });
  });
};
