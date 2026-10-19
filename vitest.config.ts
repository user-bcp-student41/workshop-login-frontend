import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/app/login/login.component.ts',
        'src/app/dashboard/dashboard.component.ts',
        'src/app/utils/legacy-format.ts',
        'src/app/core/**/*.ts',
        'src/environments/environment.ts'
      ],
      thresholds: {
        perFile: true,
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 85
      },
      reporter: ['text', 'json-summary', 'html']
    }
  }
});
