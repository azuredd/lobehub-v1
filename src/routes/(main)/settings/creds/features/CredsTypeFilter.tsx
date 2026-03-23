'use client';

import { type CredType } from '@lobechat/types';
import { Flexbox } from '@lobehub/ui';
import { Segmented } from 'antd';
import { File, Globe, Key, TerminalSquare } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface CredsTypeFilterProps {
  onChange: (type: CredType | 'all') => void;
  value: CredType | 'all';
}

const OptionLabel: FC<{ icon?: ReactNode; label: string }> = ({ icon, label }) => (
  <Flexbox horizontal align="center" gap={4}>
    {icon}
    <span>{label}</span>
  </Flexbox>
);

const CredsTypeFilter: FC<CredsTypeFilterProps> = ({ value, onChange }) => {
  const { t } = useTranslation('setting');

  const options = [
    { label: t('creds.types.all'), value: 'all' },
    {
      label: <OptionLabel icon={<TerminalSquare size={14} />} label={t('creds.types.kv-env')} />,
      value: 'kv-env',
    },
    {
      label: <OptionLabel icon={<Globe size={14} />} label={t('creds.types.kv-header')} />,
      value: 'kv-header',
    },
    {
      label: <OptionLabel icon={<Key size={14} />} label={t('creds.types.oauth')} />,
      value: 'oauth',
    },
    {
      label: <OptionLabel icon={<File size={14} />} label={t('creds.types.file')} />,
      value: 'file',
    },
  ];

  return (
    <Segmented
      options={options}
      value={value}
      onChange={(val) => onChange(val as CredType | 'all')}
    />
  );
};

export default CredsTypeFilter;
