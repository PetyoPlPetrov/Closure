const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

function withVideoComposer(config) {
  // First, copy the files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosProjectRoot = path.join(projectRoot, 'ios', config.modRequest.projectName);

      // Copy Swift files to iOS project
      const sourceFiles = [
        'VideoComposerModule.swift',
        'VideoComposer.m',
        'VideoComposer-Bridging-Header.h'
      ];

      for (const file of sourceFiles) {
        const sourcePath = path.join(projectRoot, 'modules', 'video-composer', 'ios', file);
        const destPath = path.join(iosProjectRoot, file);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`Copied ${file} to iOS project`);
        }
      }

      return config;
    },
  ]);

  // Then, add files to Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName;

    // Add Swift file to project with correct path
    const swiftFile = `${projectName}/VideoComposerModule.swift`;
    if (!xcodeProject.hasFile(swiftFile)) {
      xcodeProject.addSourceFile(
        swiftFile,
        {},
        xcodeProject.findPBXGroupKey({ name: projectName })
      );
      console.log('Added VideoComposerModule.swift to Xcode project');
    }

    // Add Objective-C bridge file to project with correct path
    const objcFile = `${projectName}/VideoComposer.m`;
    if (!xcodeProject.hasFile(objcFile)) {
      xcodeProject.addSourceFile(
        objcFile,
        {},
        xcodeProject.findPBXGroupKey({ name: projectName })
      );
      console.log('Added VideoComposer.m to Xcode project');
    }

    // Add bridging header to project with correct path
    const headerFile = `${projectName}/VideoComposer-Bridging-Header.h`;
    if (!xcodeProject.hasFile(headerFile)) {
      xcodeProject.addHeaderFile(
        headerFile,
        {},
        xcodeProject.findPBXGroupKey({ name: projectName })
      );
      console.log('Added VideoComposer-Bridging-Header.h to Xcode project');
    }

    // Set Swift bridging header build setting
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        configurations[key].buildSettings['SWIFT_OBJC_BRIDGING_HEADER'] = `${projectName}/VideoComposer-Bridging-Header.h`;
        configurations[key].buildSettings['SWIFT_VERSION'] = '5.0';
      }
    }
    console.log('Set SWIFT_OBJC_BRIDGING_HEADER build setting');

    return config;
  });

  return config;
}

module.exports = withVideoComposer;
