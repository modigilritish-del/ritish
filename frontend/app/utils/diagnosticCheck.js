// app/utils/diagnosticCheck.js
/**
 * 🔍 DIAGNOSTIC TOOL
 * Run this to check which configs are being loaded
 */

export const runDiagnostics = () => {
  console.log('\n');
  console.log('═══════════════════════════════════════════════');
  console.log('🔍 SYSTEM DIAGNOSTICS');
  console.log('═══════════════════════════════════════════════\n');
  
  // Check 1: Config Files
  console.log('📋 Checking Config Files:');
  const configsToCheck = [
    'adminMasterLinks',
    'analysisLinks',
    'abcLinks',
    'bdLinks',
    'cdLinks',
    'userManagementLinks',
    'reportsLinks',
    'ocrLinks',
    'uomLinks',
    'financeLinks',
    'itemMasterLinks',
  ];
  
  const loadedConfigs = [];
  const missingConfigs = [];
  
  configsToCheck.forEach(configName => {
    try {
      const module = require(`../config/${configName}`);
      const links = module[configName];
      if (links && Array.isArray(links)) {
        loadedConfigs.push({
          name: configName,
          count: links.length,
          links: links.map(l => l.name)
        });
        console.log(`  ✅ ${configName}: ${links.length} links`);
      } else {
        console.log(`  ⚠️  ${configName}: Found but empty or invalid`);
      }
    } catch (e) {
      missingConfigs.push(configName);
      console.log(`  ❌ ${configName}: Not found`);
    }
  });
  
  console.log('');
  
  // Check 2: Icon Components
  console.log('🎨 Checking Icon Components:');
  const iconsToCheck = [
    'AdminMaster',
    'AnalysisCreationMaster',
    'AbcMaster',
    'BdMaster',
    'CdMaster',
  ];
  
  const loadedIcons = [];
  const missingIcons = [];
  
  iconsToCheck.forEach(iconName => {
    try {
      const module = require(`../icons/${iconName}`);
      if (module.default) {
        loadedIcons.push(iconName);
        console.log(`  ✅ ${iconName}: Component found`);
      } else {
        console.log(`  ⚠️  ${iconName}: Found but no default export`);
      }
    } catch (e) {
      missingIcons.push(iconName);
      console.log(`  ❌ ${iconName}: Component not found`);
    }
  });
  
  console.log('');
  
  // Check 3: iconLoader
  console.log('🔧 Checking iconLoader:');
  try {
    const iconLoaderModule = require('./iconLoader');
    const iconPages = iconLoaderModule.iconPages || [];
    console.log(`  ✅ iconLoader loaded`);
    console.log(`  📦 Total icon pages: ${iconPages.length}`);
    iconPages.forEach(icon => {
      console.log(`     - ${icon.name} (${icon.links.length} links)`);
    });
  } catch (e) {
    console.log(`  ❌ iconLoader failed to load:`, e.message);
  }
  
  console.log('');
  
  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`Configs Loaded: ${loadedConfigs.length}/${configsToCheck.length}`);
  console.log(`Icons Loaded: ${loadedIcons.length}/${iconsToCheck.length}`);
  console.log('');
  
  if (missingConfigs.length > 0) {
    console.log('⚠️  Missing Configs:', missingConfigs.join(', '));
  }
  
  if (missingIcons.length > 0) {
    console.log('⚠️  Missing Icon Components:', missingIcons.join(', '));
  }
  
  console.log('═══════════════════════════════════════════════\n');
  
  return {
    loadedConfigs,
    missingConfigs,
    loadedIcons,
    missingIcons
  };
};

// Auto-run in browser
if (typeof window !== 'undefined') {
  window.runDiagnostics = runDiagnostics;
  console.log('💡 Diagnostic tool loaded. Run window.runDiagnostics() to check system.\n');
}
