import type { FormItemProps } from '@lobehub/ui';
import type { TFunction } from 'i18next';

import { FormInput, FormPassword } from '@/components/FormInput';

import type { IntegrationProvider } from '../../const';

export const getFeishuFormItems = (
  t: TFunction,
  hasConfig: boolean,
  provider: IntegrationProvider,
): FormItemProps[] => [
  {
    children: <FormInput placeholder={t('integration.applicationIdPlaceholder')} />,
    label: t('integration.applicationId'),
    name: 'applicationId',
    rules: [{ required: true }],
    tag: provider.fieldTags.appId,
  },
  {
    children: (
      <FormPassword
        autoComplete="new-password"
        placeholder={
          hasConfig
            ? t('integration.botTokenPlaceholderExisting')
            : t('integration.appSecretPlaceholder')
        }
      />
    ),
    desc: t('integration.botTokenEncryptedHint'),
    label: t('integration.appSecret'),
    name: 'appSecret',
    rules: [{ required: true }],
    tag: provider.fieldTags.appSecret,
  },
  {
    children: <FormInput placeholder={t('integration.verificationTokenPlaceholder')} />,
    desc: t('integration.verificationTokenHint'),
    label: t('integration.verificationToken'),
    name: 'verificationToken',
    tag: provider.fieldTags.verificationToken,
  },
  {
    children: <FormPassword placeholder={t('integration.encryptKeyPlaceholder')} />,
    desc: t('integration.encryptKeyHint'),
    label: t('integration.encryptKey'),
    name: 'encryptKey',
    tag: provider.fieldTags.encryptKey,
  },
];
