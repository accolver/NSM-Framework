/**
 * Build Validation Tests - TDD Infrastructure Tests
 * Tests that the build system can handle problematic dependencies
 */

import { describe, test, expect } from 'bun:test';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

describe('Build System Validation', () => {
  test('vite dev server should start without Acorn module errors', async () => {
    const startTime = Date.now();
    let serverOutput = '';
    let hasAcornErrors = false;
    let serverStarted = false;

    const viteProcess = spawn('npx', ['vite', '--port', '5175'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        viteProcess.kill();
        reject(new Error('Vite server failed to start within 30 seconds'));
      }, 30000);

      viteProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;

        // Check for successful server start - multiple patterns
        if ((output.includes('ready in') && output.includes('Local:')) ||
            (output.includes('VITE') && output.includes('ready in'))) {
          serverStarted = true;
        }
      });

      viteProcess.stderr.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;

        // Check for Acorn-specific errors
        if (output.includes('parse_dammit') ||
            output.includes('LooseParser') ||
            output.includes('pluginsLoose')) {
          hasAcornErrors = true;
        }
      });

      viteProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (hasAcornErrors) {
          reject(new Error(`Acorn module errors detected:\n${serverOutput}`));
        } else if (!serverStarted && code !== 0) {
          reject(new Error(`Vite failed to start (exit code ${code}):\n${serverOutput}`));
        } else {
          resolve();
        }
      });

      // Give server time to start, then kill it
      setTimeout(() => {
        viteProcess.kill();
        clearTimeout(timeout);

        if (hasAcornErrors) {
          reject(new Error(`Acorn module errors detected:\n${serverOutput}`));
        } else if (serverStarted) {
          resolve();
        } else {
          reject(new Error(`Server didn't start properly:\n${serverOutput}`));
        }
      }, 10000);
    });
  }, 35000);

  test('vite build should complete without Acorn module errors', async () => {
    let buildOutput = '';
    let hasAcornErrors = false;

    const buildProcess = spawn('npx', ['vite', 'build'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        buildProcess.kill();
        reject(new Error('Build process took too long'));
      }, 60000);

      buildProcess.stdout.on('data', (data) => {
        buildOutput += data.toString();
      });

      buildProcess.stderr.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;

        // Check for Acorn-specific errors
        if (output.includes('parse_dammit') ||
            output.includes('LooseParser') ||
            output.includes('pluginsLoose')) {
          hasAcornErrors = true;
        }
      });

      buildProcess.on('close', (code) => {
        clearTimeout(timeout);

        if (hasAcornErrors) {
          reject(new Error(`Acorn module errors in build:\n${buildOutput}`));
        } else if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed (exit code ${code}):\n${buildOutput}`));
        }
      });
    });
  }, 65000);

  test('CJS deprecation warning should be resolved', async () => {
    let serverOutput = '';
    let hasCJSWarning = false;

    const viteProcess = spawn('npx', ['vite', '--port', '5176'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        viteProcess.kill();
        reject(new Error('Test timeout'));
      }, 15000);

      viteProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
      });

      viteProcess.stderr.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;

        if (output.includes('CJS build of Vite\'s Node API is deprecated')) {
          hasCJSWarning = true;
        }
      });

      viteProcess.on('close', () => {
        clearTimeout(timeout);

        if (hasCJSWarning) {
          reject(new Error(`CJS deprecation warning still present:\n${serverOutput}`));
        } else {
          resolve();
        }
      });

      // Kill after 8 seconds
      setTimeout(() => {
        viteProcess.kill();
        clearTimeout(timeout);

        if (hasCJSWarning) {
          reject(new Error(`CJS deprecation warning still present:\n${serverOutput}`));
        } else {
          resolve();
        }
      }, 8000);
    });
  }, 20000);

  test('dist folder should be created with expected assets', async () => {
    const distPath = path.join(process.cwd(), 'dist');

    try {
      const stats = await fs.stat(distPath);
      expect(stats.isDirectory()).toBe(true);

      const files = await fs.readdir(distPath);
      const hasIndexHtml = files.includes('index.html');
      const hasAssetsFolder = files.includes('assets');

      expect(hasIndexHtml).toBe(true);
      expect(hasAssetsFolder).toBe(true);

      if (hasAssetsFolder) {
        const assetsPath = path.join(distPath, 'assets');
        const assetFiles = await fs.readdir(assetsPath);
        const hasJSFiles = assetFiles.some(file => file.endsWith('.js'));
        expect(hasJSFiles).toBe(true);
      }
    } catch (error) {
      throw new Error(`Build output validation failed: ${error.message}`);
    }
  });
});