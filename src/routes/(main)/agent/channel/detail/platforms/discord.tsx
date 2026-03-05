import type { FormItemProps } from '@lobehub/ui';
import type { TFunction } from 'i18next';

import { FormInput, FormPassword } from '@/components/FormInput';

import type { IntegrationProvider } from '../../const';

export const getDiscordFormItems = (
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
            : t('integration.botTokenPlaceholderNew')
        }
      />
    ),
    desc: t('integration.botTokenEncryptedHint'),
    label: t('integration.botToken'),
    name: 'botToken',
    rules: [{ required: true }],
    tag: provider.fieldTags.token,
  },
  {
    children: <FormInput placeholder={t('integration.publicKeyPlaceholder')} />,
    label: t('integration.publicKey'),
    name: 'publicKey',
    tag: provider.fieldTags.publicKey,
  },
];
