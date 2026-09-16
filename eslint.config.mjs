import coreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';

const config = [
  ...coreWebVitals,
  prettier,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'pages-redirect/**',
      'public/**/*.html',
    ],
    rules: {
      // Browser-only cookie hydration and media-query setup intentionally sync
      // React state in effects after the client is mounted.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
