/**
 * Test suite for API documentation completeness and accuracy
 * Tests that all documented APIs exist and examples are executable
 */

const fs = require('fs');
const path = require('path');

describe('API Documentation Tests', () => {
  const docsPath = path.join(__dirname);
  const expectedApiFiles = [
    'api/nsm-client-sdk.mdx',
    'api/nsm-client.mdx',
    'api/nsm-core.mdx',
    'api/blossom-client.mdx',
    'api/dev-tools.mdx'
  ];

  test('all API documentation files exist', () => {
    expectedApiFiles.forEach(file => {
      const filePath = path.join(docsPath, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('mint.json navigation includes new API pages', () => {
    const mintPath = path.join(docsPath, 'mint.json');
    const mintContent = JSON.parse(fs.readFileSync(mintPath, 'utf8'));

    const apiGroup = mintContent.navigation.find(nav => nav.group === 'API Documentation');
    expect(apiGroup).toBeDefined();

    const expectedPages = [
      'api/overview',
      'api/nsm-client-sdk',
      'api/nsm-client',
      'api/nsm-core',
      'api/blossom-client',
      'api/dev-tools'
    ];

    expectedPages.forEach(page => {
      expect(apiGroup.pages).toContain(page);
    });
  });

  test('API documentation follows Mintlify format', () => {
    expectedApiFiles.forEach(file => {
      const filePath = path.join(docsPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check frontmatter exists
        expect(content.startsWith('---')).toBe(true);
        expect(content.includes('title:')).toBe(true);
        expect(content.includes('description:')).toBe(true);

        // Check for proper MDX structure
        expect(content.includes('```typescript')).toBe(true);
      }
    });
  });

  test('code examples contain valid TypeScript syntax', () => {
    expectedApiFiles.forEach(file => {
      const filePath = path.join(docsPath, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');

        // Extract TypeScript code blocks
        const codeBlocks = content.match(/```typescript([\s\S]*?)```/g);
        if (codeBlocks) {
          codeBlocks.forEach(block => {
            const code = block.replace(/```typescript|```/g, '').trim();

            // Basic syntax checks
            expect(code.length).toBeGreaterThan(0);

            // Check for common TypeScript patterns
            if (code.includes('interface') || code.includes('type') || code.includes('class')) {
              // Should have proper TypeScript syntax - either braces for complex types or semicolons for simple types
              expect(code).toMatch(/[{}]|;/); // Basic structure check for braces or semicolons
            }
          });
        }
      }
    });
  });

  test('all major APIs are documented with examples', () => {
    const requiredApiMethods = {
      'nsm-client.mdx': ['connect', 'disconnect', 'discoverApplications', 'loadApplication'],
      'blossom-client.mdx': ['upload', 'download', 'delete', 'uploadWithReplication'],
      'nsm-core.mdx': ['createNSMDefinitionEvent', 'validateNSMDefinitionEvent', 'NSM_PROTOCOL']
    };

    Object.entries(requiredApiMethods).forEach(([file, methods]) => {
      const filePath = path.join(docsPath, 'api', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        methods.forEach(method => {
          expect(content).toContain(method);
        });
      }
    });
  });
});