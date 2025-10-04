import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';

describe('GitHub Actions Workflow Validation', () => {
  const workflowPath = resolve(__dirname, '../../../.github/workflows/deploy.yml');
  const workflowContent = readFileSync(workflowPath, 'utf-8');

  it('should be valid YAML', () => {
    expect(() => parse(workflowContent)).not.toThrow();
  });

  it('should have required workflow structure', () => {
    const workflow = parse(workflowContent);

    expect(workflow.name).toBe('Deploy to GitHub Pages');
    expect(workflow.on).toBeDefined();
    expect(workflow.jobs).toBeDefined();
    expect(workflow.permissions).toBeDefined();
  });

  it('should have correct permissions for GitHub Pages', () => {
    const workflow = parse(workflowContent);

    expect(workflow.permissions).toEqual({
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    });
  });

  it('should have build and deploy jobs', () => {
    const workflow = parse(workflowContent);

    expect(workflow.jobs.build).toBeDefined();
    expect(workflow.jobs.deploy).toBeDefined();
  });

  it('should configure build job correctly', () => {
    const workflow = parse(workflowContent);
    const buildJob = workflow.jobs.build;

    expect(buildJob['runs-on']).toBe('ubuntu-latest');
    expect(buildJob.steps).toBeDefined();
    expect(Array.isArray(buildJob.steps)).toBe(true);

    // Check for required steps
    const stepNames = buildJob.steps.map((step: any) => step.name);
    expect(stepNames).toContain('Checkout');
    expect(stepNames).toContain('Setup Bun');
    expect(stepNames).toContain('Install dependencies');
    expect(stepNames).toContain('Build landing page');
    expect(stepNames).toContain('Build POC Wordle');
    expect(stepNames).toContain('Prepare deployment directory');
    expect(stepNames).toContain('Upload artifact');
  });

  it('should set correct base paths for builds', () => {
    const workflow = parse(workflowContent);
    const buildJob = workflow.jobs.build;

    const landingPageStep = buildJob.steps.find(
      (step: any) => step.name === 'Build landing page'
    );
    const wordleStep = buildJob.steps.find(
      (step: any) => step.name === 'Build POC Wordle'
    );

    expect(landingPageStep?.env?.VITE_BASE_PATH).toBe('/NSM-Framework/');
    expect(wordleStep?.env?.VITE_BASE_PATH).toBe('/NSM-Framework/wordle/');
  });

  it('should configure deploy job correctly', () => {
    const workflow = parse(workflowContent);
    const deployJob = workflow.jobs.deploy;

    expect(deployJob['runs-on']).toBe('ubuntu-latest');
    expect(deployJob.needs).toBe('build');
    expect(deployJob.environment).toBeDefined();
    expect(deployJob.environment.name).toBe('github-pages');
  });

  it('should trigger on main branch and manual dispatch', () => {
    const workflow = parse(workflowContent);

    expect(workflow.on.push.branches).toContain('main');
    expect(workflow.on.workflow_dispatch).toBeDefined();
  });

  it('should watch correct paths for changes', () => {
    const workflow = parse(workflowContent);

    const paths = workflow.on.push.paths;
    expect(paths).toContain('apps/landing-page/**');
    expect(paths).toContain('apps/poc-wordle/**');
    expect(paths).toContain('packages/**');
    expect(paths).toContain('.github/workflows/deploy.yml');
  });
});
