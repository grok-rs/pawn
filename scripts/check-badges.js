#!/usr/bin/env node

/**
 * Badge Status Checker
 * 
 * This script checks the status of all badges in the README.md file
 * to ensure they are working correctly and displaying proper icons.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Badge configurations from README.md
const badges = [
  {
    name: 'CI Orchestration',
    url: 'https://github.com/grok-rs/pawn/workflows/CI%20Orchestration%20(Complete%20Pipeline)/badge.svg',
    type: 'workflow'
  },
  {
    name: 'Backend Tests',
    url: 'https://github.com/grok-rs/pawn/workflows/Backend%20Quality%20Gates%20(Parallelized)/badge.svg',
    type: 'workflow'
  },
  {
    name: 'Frontend Tests', 
    url: 'https://github.com/grok-rs/pawn/workflows/Frontend%20Quality%20Gates/badge.svg',
    type: 'workflow'
  },
  {
    name: 'Security Audit',
    url: 'https://github.com/grok-rs/pawn/workflows/Security%20Audit/badge.svg',
    type: 'workflow'
  },
  {
    name: 'Code Coverage',
    url: 'https://codecov.io/gh/grok-rs/pawn/branch/main/graph/badge.svg',
    type: 'codecov'
  },
  {
    name: 'Quality Gate',
    url: 'https://img.shields.io/badge/Quality-Monitored-green.svg',
    type: 'shields'
  },
  {
    name: 'Dependencies',
    url: 'https://img.shields.io/badge/Dependencies-Monitored-blue.svg', 
    type: 'shields'
  },
  {
    name: 'License',
    url: 'https://img.shields.io/badge/License-MIT-yellow.svg',
    type: 'shields'
  },
  {
    name: 'Tauri Version',
    url: 'https://img.shields.io/badge/Tauri-2.6.0-blue.svg',
    type: 'shields'
  },
  {
    name: 'Rust Version',
    url: 'https://img.shields.io/badge/Rust-1.70+-orange.svg',
    type: 'shields'
  },
  {
    name: 'React Version',
    url: 'https://img.shields.io/badge/React-18.3+-blue.svg',
    type: 'shields'
  }
];

/**
 * Check if a URL returns a valid response
 */
function checkBadge(badge) {
  return new Promise((resolve) => {
    const request = https.get(badge.url, (response) => {
      const { statusCode, headers } = response;
      const contentType = headers['content-type'] || '';
      
      resolve({
        ...badge,
        status: statusCode,
        contentType,
        isValid: statusCode === 200 && contentType.includes('image/svg+xml'),
        error: null
      });
    });

    request.on('error', (error) => {
      resolve({
        ...badge,
        status: 0,
        contentType: '',
        isValid: false,
        error: error.message
      });
    });

    request.setTimeout(10000, () => {
      request.destroy();
      resolve({
        ...badge,
        status: 0,
        contentType: '',
        isValid: false,
        error: 'Timeout'
      });
    });
  });
}

/**
 * Check all badges and generate report
 */
async function checkAllBadges() {
  console.log('🔍 Checking badge status...\n');
  
  const results = await Promise.all(badges.map(checkBadge));
  
  let validCount = 0;
  let invalidCount = 0;
  
  console.log('📊 Badge Status Report:');
  console.log('========================\n');
  
  results.forEach((result) => {
    const icon = result.isValid ? '✅' : '❌';
    const status = result.status || 'Error';
    const error = result.error ? ` (${result.error})` : '';
    
    console.log(`${icon} ${result.name.padEnd(20)} | Status: ${status}${error}`);
    
    if (result.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  });
  
  console.log('\n📈 Summary:');
  console.log(`✅ Valid badges: ${validCount}`);
  console.log(`❌ Invalid badges: ${invalidCount}`);
  console.log(`📊 Total badges: ${results.length}`);
  
  // Generate recommendations
  if (invalidCount > 0) {
    console.log('\n🔧 Recommendations:');
    
    results.filter(r => !r.isValid).forEach((result) => {
      if (result.type === 'workflow') {
        console.log(`- Check if workflow "${result.name}" exists and is properly configured`);
      } else if (result.error) {
        console.log(`- Fix network issue for "${result.name}": ${result.error}`);
      }
    });
  }
  
  // Create JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      successRate: Math.round((validCount / results.length) * 100)
    },
    badges: results
  };
  
  const reportPath = path.join(__dirname, '..', 'badge-status-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return invalidCount === 0;
}

/**
 * Main execution
 */
checkAllBadges()
  .then((allValid) => {
    if (allValid) {
      console.log('\n🎉 All badges are working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some badges need attention.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Error checking badges:', error);
    process.exit(1);
  });