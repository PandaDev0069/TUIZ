#!/usr/bin/env node

/**
 * Script to update console.log/error/warn statements to use logger utility
 * across the backend codebase for production-safe logging
 */

const fs = require('fs');
const path = require('path');

// Files to update (relative to backend directory)
const filesToUpdate = [
  'routes/api/quiz.js',
  'routes/api/questions.js', 
  'routes/api/answers.js',
  'routes/api/games.js',
  'routes/api/gameResults.js',
  'routes/api/gameSettings.js',
  'routes/api/playerManagement.js',
  'routes/api/questionSets.js',
  'routes/auth.js',
  'routes/upload.js',
  'utils/SupabaseAuthHelper.js',
  'utils/OrderManager.js',
  'utils/SecurityUtils.js',
  'server.js'
];

const updateConsoleStatements = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Check if logger is already imported
    if (!content.includes("require('../utils/logger')") && !content.includes("require('./utils/logger')")) {
      // Add logger import after other requires
      const requireLines = content.split('\n').filter(line => line.trim().startsWith('const') && line.includes('require('));
      if (requireLines.length > 0) {
        // Find the last require statement
        const lastRequireIndex = content.lastIndexOf(requireLines[requireLines.length - 1]);
        const afterLastRequire = content.indexOf('\n', lastRequireIndex) + 1;
        
        // Determine the correct relative path to logger
        const relativePath = filePath.includes('routes/api/') ? '../../utils/logger' :
                           filePath.includes('routes/') ? '../utils/logger' :
                           filePath.includes('utils/') ? './logger' : 
                           './utils/logger';
        
        content = content.slice(0, afterLastRequire) + 
                 `const logger = require('${relativePath}');\n` +
                 content.slice(afterLastRequire);
        hasChanges = true;
        console.log(`✅ Added logger import to ${filePath}`);
      }
    }
    
    // Replace console.log statements (non-error)
    const logRegex = /console\.log\(/g;
    if (logRegex.test(content)) {
      content = content.replace(/console\.log\(/g, 'logger.debug(');
      hasChanges = true;
    }
    
    // Replace console.error statements
    const errorRegex = /console\.error\(/g;
    if (errorRegex.test(content)) {
      content = content.replace(/console\.error\(/g, 'logger.error(');
      hasChanges = true;
    }
    
    // Replace console.warn statements
    const warnRegex = /console\.warn\(/g;
    if (warnRegex.test(content)) {
      content = content.replace(/console\.warn\(/g, 'logger.warn(');
      hasChanges = true;
    }
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`📝 Updated console statements in ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
};

const main = () => {
  console.log('🚀 Starting backend logging update...\n');
  
  let totalFiles = 0;
  let updatedFiles = 0;
  
  for (const file of filesToUpdate) {
    const fullPath = path.join(__dirname, '..', file);
    
    if (fs.existsSync(fullPath)) {
      totalFiles++;
      console.log(`\n🔍 Processing: ${file}`);
      
      if (updateConsoleStatements(fullPath)) {
        updatedFiles++;
      } else {
        console.log(`ℹ️  No changes needed in ${file}`);
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log(`\n✨ Logging update complete!`);
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`📝 Files updated: ${updatedFiles}`);
  console.log(`\n🎯 Benefits:`);
  console.log(`   • Debug statements only show in development`);
  console.log(`   • Error logging preserved for production`);
  console.log(`   • Consistent logging pattern across codebase`);
  console.log(`   • Reduced production log verbosity`);
};

if (require.main === module) {
  main();
}

module.exports = { updateConsoleStatements };
