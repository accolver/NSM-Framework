#!/usr/bin/env node

/**
 * Bundle Analysis Tool for NSM Framework
 * Analyzes Vite build outputs and provides optimization recommendations
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class BundleAnalyzer {
  constructor(options = {}) {
    this.options = {
      threshold: {
        warning: 500 * 1024, // 500KB
        error: 1000 * 1024,  // 1MB
      },
      ...options
    };
  }

  /**
   * Analyze a directory for build artifacts
   */
  analyzeDirectory(dirPath) {
    if (!existsSync(dirPath)) {
      console.warn(`❌ Directory not found: ${dirPath}`);
      return null;
    }

    const files = this.getFilesRecursive(dirPath);
    const analysis = {
      path: dirPath,
      totalSize: 0,
      files: [],
      chunks: [],
      assets: []
    };

    files.forEach(filePath => {
      const stat = statSync(filePath);
      const relativePath = relative(dirPath, filePath);
      const fileInfo = {
        path: relativePath,
        size: stat.size,
        type: this.getFileType(filePath)
      };

      analysis.totalSize += stat.size;
      analysis.files.push(fileInfo);

      // Categorize files
      if (fileInfo.type === 'js') {
        analysis.chunks.push(fileInfo);
      } else {
        analysis.assets.push(fileInfo);
      }
    });

    // Sort by size (descending)
    analysis.chunks.sort((a, b) => b.size - a.size);
    analysis.assets.sort((a, b) => b.size - a.size);

    return analysis;
  }

  /**
   * Get all files recursively
   */
  getFilesRecursive(dir) {
    const files = [];
    const items = readdirSync(dir);

    items.forEach(item => {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursive(fullPath));
      } else {
        files.push(fullPath);
      }
    });

    return files;
  }

  /**
   * Determine file type
   */
  getFileType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'mjs':
        return 'js';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'map':
        return 'map';
      default:
        return 'asset';
    }
  }

  /**
   * Format file size
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get size status (ok, warning, error)
   */
  getSizeStatus(size) {
    if (size >= this.options.threshold.error) return 'error';
    if (size >= this.options.threshold.warning) return 'warning';
    return 'ok';
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for large chunks
    const largeChunks = analysis.chunks.filter(chunk =>
      chunk.size > this.options.threshold.warning
    );

    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: largeChunks.some(c => c.size > this.options.threshold.error) ? 'error' : 'warning',
        message: `Found ${largeChunks.length} large JavaScript chunks`,
        details: largeChunks.map(c => `${c.path}: ${this.formatSize(c.size)}`),
        suggestions: [
          'Consider code splitting with dynamic imports',
          'Implement lazy loading for non-critical components',
          'Use manual chunk splitting in Vite config',
          'Review dependencies that might be duplicated across chunks'
        ]
      });
    }

    // Check total bundle size
    const totalJSSize = analysis.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    if (totalJSSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push({
        type: 'performance',
        severity: 'error',
        message: `Total JavaScript size is very large: ${this.formatSize(totalJSSize)}`,
        suggestions: [
          'Audit dependencies with tools like webpack-bundle-analyzer',
          'Remove unused dependencies',
          'Use tree shaking to eliminate dead code',
          'Consider using lighter alternatives for heavy libraries'
        ]
      });
    }

    // Check for missing compression
    const hasSourceMaps = analysis.files.some(f => f.type === 'map');
    if (!hasSourceMaps) {
      recommendations.push({
        type: 'debug',
        severity: 'info',
        message: 'No source maps found',
        suggestions: [
          'Enable source maps in production for better debugging',
          'Consider using hidden-source-map for production'
        ]
      });
    }

    // Check for unoptimized assets
    const largeAssets = analysis.assets.filter(asset =>
      asset.size > 100 * 1024 && !asset.path.includes('.map')
    );

    if (largeAssets.length > 0) {
      recommendations.push({
        type: 'assets',
        severity: 'warning',
        message: `Found ${largeAssets.length} large asset files`,
        details: largeAssets.map(a => `${a.path}: ${this.formatSize(a.size)}`),
        suggestions: [
          'Optimize images with tools like imagemin',
          'Use modern image formats (WebP, AVIF)',
          'Consider lazy loading for images',
          'Use CDN for large static assets'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Print analysis report
   */
  printReport(analysis, appName = 'App') {
    console.log(`\n📊 Bundle Analysis: ${appName}`);
    console.log('='.repeat(50));

    // Summary
    console.log(`\n📁 Directory: ${analysis.path}`);
    console.log(`📦 Total Size: ${this.formatSize(analysis.totalSize)}`);
    console.log(`📄 Total Files: ${analysis.files.length}`);

    // JavaScript chunks
    if (analysis.chunks.length > 0) {
      console.log(`\n🟨 JavaScript Chunks (${analysis.chunks.length}):`);
      analysis.chunks.forEach(chunk => {
        const status = this.getSizeStatus(chunk.size);
        const statusIcon = status === 'error' ? '🔴' : status === 'warning' ? '🟡' : '🟢';
        console.log(`  ${statusIcon} ${chunk.path.padEnd(30)} ${this.formatSize(chunk.size)}`);
      });
    }

    // Large assets
    const significantAssets = analysis.assets.filter(a => a.size > 10 * 1024);
    if (significantAssets.length > 0) {
      console.log(`\n📎 Assets (${significantAssets.length} shown):`);
      significantAssets.slice(0, 10).forEach(asset => {
        const status = this.getSizeStatus(asset.size);
        const statusIcon = status === 'error' ? '🔴' : status === 'warning' ? '🟡' : '🟢';
        console.log(`  ${statusIcon} ${asset.path.padEnd(30)} ${this.formatSize(asset.size)}`);
      });
    }

    // Recommendations
    const recommendations = this.generateRecommendations(analysis);
    if (recommendations.length > 0) {
      console.log(`\n💡 Optimization Recommendations:`);
      recommendations.forEach((rec, index) => {
        const icon = rec.severity === 'error' ? '🚨' : rec.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`\n${index + 1}. ${icon} ${rec.message}`);

        if (rec.details) {
          rec.details.forEach(detail => {
            console.log(`     📋 ${detail}`);
          });
        }

        if (rec.suggestions) {
          rec.suggestions.forEach(suggestion => {
            console.log(`     💡 ${suggestion}`);
          });
        }
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Compare two analyses
   */
  compareAnalyses(before, after, appName = 'App') {
    console.log(`\n📈 Bundle Size Comparison: ${appName}`);
    console.log('='.repeat(50));

    const sizeDiff = after.totalSize - before.totalSize;
    const percentChange = ((sizeDiff / before.totalSize) * 100).toFixed(2);

    const changeIcon = sizeDiff > 0 ? '📈' : sizeDiff < 0 ? '📉' : '➡️';
    const changeText = sizeDiff > 0 ? 'increased' : sizeDiff < 0 ? 'decreased' : 'unchanged';

    console.log(`\n${changeIcon} Total size ${changeText} by ${this.formatSize(Math.abs(sizeDiff))} (${percentChange}%)`);
    console.log(`   Before: ${this.formatSize(before.totalSize)}`);
    console.log(`   After:  ${this.formatSize(after.totalSize)}`);

    // Compare individual chunks
    const beforeChunks = new Map(before.chunks.map(c => [c.path, c.size]));
    const afterChunks = new Map(after.chunks.map(c => [c.path, c.size]));

    console.log(`\n📊 Chunk Size Changes:`);
    const allChunkPaths = new Set([...beforeChunks.keys(), ...afterChunks.keys()]);

    for (const chunkPath of allChunkPaths) {
      const beforeSize = beforeChunks.get(chunkPath) || 0;
      const afterSize = afterChunks.get(chunkPath) || 0;
      const diff = afterSize - beforeSize;

      if (diff !== 0) {
        const diffIcon = diff > 0 ? '📈' : '📉';
        const diffPercent = beforeSize > 0 ? ((diff / beforeSize) * 100).toFixed(1) : 'new';
        console.log(`   ${diffIcon} ${chunkPath}: ${this.formatSize(afterSize)} (${diff > 0 ? '+' : ''}${this.formatSize(diff)}, ${diffPercent}%)`);
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const analyzer = new BundleAnalyzer();
  const projectRoot = join(__dirname, '..');

  const apps = [
    {
      name: 'Whiteboard App',
      path: join(projectRoot, 'apps/poc-whiteboard/dist')
    },
    {
      name: 'Wordle App',
      path: join(projectRoot, 'apps/poc-wordle/dist')
    }
  ];

  console.log('🔍 NSM Framework Bundle Analysis');
  console.log('================================');

  let totalProjectSize = 0;
  const analyses = [];

  for (const app of apps) {
    const analysis = analyzer.analyzeDirectory(app.path);
    if (analysis) {
      analyses.push({ name: app.name, analysis });
      totalProjectSize += analysis.totalSize;
      analyzer.printReport(analysis, app.name);
    }
  }

  // Project summary
  if (analyses.length > 0) {
    console.log(`\n🏗️ Project Summary`);
    console.log('='.repeat(50));
    console.log(`📦 Total Project Size: ${analyzer.formatSize(totalProjectSize)}`);
    console.log(`📱 Number of Apps: ${analyses.length}`);

    const avgSize = totalProjectSize / analyses.length;
    console.log(`📊 Average App Size: ${analyzer.formatSize(avgSize)}`);

    // Performance benchmarks
    console.log(`\n⚡ Performance Benchmarks:`);
    console.log(`   🌐 3G Download Time: ~${Math.ceil(totalProjectSize / (1.6 * 1024 * 1024 / 8))}s`);
    console.log(`   📶 4G Download Time: ~${Math.ceil(totalProjectSize / (10 * 1024 * 1024 / 8))}s`);
    console.log(`   🚀 Fiber Download Time: ~${Math.ceil(totalProjectSize / (100 * 1024 * 1024 / 8))}s`);
  }

  console.log(`\n✨ Analysis complete! Run this tool after changes to track improvements.`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BundleAnalyzer };