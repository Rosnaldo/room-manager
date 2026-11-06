export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // allow ticket ids like "feat(SALA-2): ..." as scopes
    'scope-case': [0],
  },
};
