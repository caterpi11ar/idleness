import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/config-precedence',
        'guides/config-files',
        'guides/env-vars',
        'guides/schema-validation',
        'guides/aliases-and-sub',
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api/reference',
      ],
    },
  ],
}

export default sidebars
