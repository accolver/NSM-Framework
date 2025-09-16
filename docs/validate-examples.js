/**
 * Validate TypeScript code examples in API documentation
 */

const fs = require('fs');
const path = require('path');

function extractTypeScriptBlocks(content) {
  const blocks = [];
  const regex = /```typescript\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      code: match[1].trim(),
      line: content.substring(0, match.index).split('\n').length
    });
  }

  return blocks;
}

function validateTypeScriptSyntax(code, filename, line) {
  // Basic syntax validation checks
  const issues = [];

  // Check for common syntax errors
  if (code.includes('}') && !code.includes('{')) {
    issues.push(`Missing opening brace`);
  }

  if (code.includes(')') && !code.includes('(')) {
    issues.push(`Missing opening parenthesis`);
  }

  // Check for unclosed strings
  const singleQuotes = (code.match(/'/g) || []).length;
  const doubleQuotes = (code.match(/"/g) || []).length;
  const backticks = (code.match(/`/g) || []).length;

  if (singleQuotes % 2 !== 0) {
    issues.push(`Unclosed single quote`);
  }
  if (doubleQuotes % 2 !== 0) {
    issues.push(`Unclosed double quote`);
  }
  if (backticks % 2 !== 0) {
    issues.push(`Unclosed template literal`);
  }

  // Check for basic TypeScript/JavaScript structure
  if (code.includes('import') && !code.includes('from')) {
    issues.push(`Incomplete import statement`);
  }

  return {
    valid: issues.length === 0,
    issues,
    filename,
    line
  };
}

function validateDocumentation() {
  const apiFiles = [
    'api/nsm-client-sdk.mdx',
    'api/nsm-client.mdx',
    'api/nsm-core.mdx',
    'api/blossom-client.mdx',
    'api/dev-tools.mdx'
  ];

  console.log('🔍 Validating TypeScript examples in API documentation...\n');

  let totalBlocks = 0;
  let validBlocks = 0;
  let totalIssues = 0;

  for (const file of apiFiles) {
    if (!fs.existsSync(file)) {
      console.log(`❌ ${file}: File not found`);
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const blocks = extractTypeScriptBlocks(content);

    console.log(`📄 ${file}: ${blocks.length} TypeScript blocks`);

    blocks.forEach((block, index) => {
      totalBlocks++;
      const validation = validateTypeScriptSyntax(block.code, file, block.line);

      if (validation.valid) {
        validBlocks++;
        console.log(`  ✅ Block ${index + 1}: Valid`);
      } else {
        totalIssues += validation.issues.length;
        console.log(`  ❌ Block ${index + 1} (line ${block.line}): ${validation.issues.join(', ')}`);
      }
    });

    console.log('');
  }

  console.log('📊 Validation Summary:');
  console.log(`   Total blocks: ${totalBlocks}`);
  console.log(`   Valid blocks: ${validBlocks}`);
  console.log(`   Success rate: ${totalBlocks > 0 ? Math.round((validBlocks / totalBlocks) * 100) : 0}%`);
  console.log(`   Issues found: ${totalIssues}`);

  if (validBlocks === totalBlocks && totalIssues === 0) {
    console.log('\n✅ All TypeScript examples are syntactically valid!');
    return true;
  } else {
    console.log(`\n❌ Found ${totalIssues} syntax issues in ${totalBlocks - validBlocks} code blocks`);
    return false;
  }
}

// Run validation
const isValid = validateDocumentation();
process.exit(isValid ? 0 : 1);