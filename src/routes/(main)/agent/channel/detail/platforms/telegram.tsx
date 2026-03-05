import type { FormItemProps } from '@lobehub/ui';
import type { TFunction } from 'i18next';

import { FormInput, FormPassword } from '@/components/FormInput';

import type { IntegrationProvider } from '../../const';

export const getTelegramFormItems = (
  t: TFunction,
  hasConfig: boolean,
  provider: IntegrationProvider,
): FormItemProps[] => [
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
    children: <FormPassword placeholder={t('integration.secretTokenPlaceholder')} />,
    desc: t('integration.secretTokenHint'),
    label: t('integration.secretToken'),
    name: 'secretToken',
    tag: provider.fieldTags.secretToken,
  },
  ...(process.env.NODE_ENV === 'development'
    ? ([
        {
          children: <FormInput placeholder="https://xxx.trycloudflare.com" />,
          desc: t('integration.devWebhookProxyUrlHint'),
          label: t('integration.devWebhookProxyUrl'),
          name: 'webhookProxyUrl',
        },
      ] as FormItemProps[])
    : []),
];
