import React from 'react';
import { SlashMenu, SlashMenuProps } from '@/modules/common/components/SlashMenu';

export const VaultSlashMenu: React.FC<SlashMenuProps> = (props) => {
  return <SlashMenu id="vault-slash-menu" {...props} />;
};
