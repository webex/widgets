//Data Extraction and Processing
const comparisonState = {
  cachedChangelogA: null,
  cachedChangelogB: null,
  currentStableA: null,
  currentStableB: null,

  reset() {
    this.cachedChangelogA = null;
    this.cachedChangelogB = null;
    this.currentStableA = null;
    this.currentStableB = null;
  },

  update(changelogA, changelogB, stableA, stableB) {
    this.cachedChangelogA = changelogA;
    this.cachedChangelogB = changelogB;
    this.currentStableA = stableA;
    this.currentStableB = stableB;
  },
};
const extractPackagesFromVersion = (changelog, specificVersions = null) => {
  const packageMap = {};

  for (const packageName of Object.keys(changelog)) {
    const packageVersions = changelog[packageName];
    console.log('packageVersions', packageVersions);

    // Safety check: ensure packageVersions is an object
    if (!packageVersions || typeof packageVersions !== 'object') continue;

    const versionKeys = Object.keys(packageVersions);
    console.log('versionKeys', versionKeys);

    if (versionKeys.length === 0) continue;

    let selectedVersion = null;

    // Check if user specified a specific version for this package
    if (specificVersions && specificVersions[packageName]) {
      const requestedVersion = specificVersions[packageName];

      if (packageVersions[requestedVersion]) {
        selectedVersion = requestedVersion;
      }
    }

    // If no specific version requested or not found, use earliest (first) version
    if (!selectedVersion) {
      let earliestVersion = versionKeys[0];
      let earliestDate = packageVersions[earliestVersion]?.published_date || Infinity;

      for (const version of versionKeys) {
        const publishedDate = packageVersions[version]?.published_date || Infinity;
        if (publishedDate < earliestDate) {
          earliestDate = publishedDate;
          earliestVersion = version;
        }
      }

      selectedVersion = earliestVersion;
    }

    packageMap[packageName] = selectedVersion;
  }

  return packageMap;
};
const findLatestPackageVersion = (changelog, packageName) => {
  if (!changelog[packageName]) return null;

  const versions = Object.keys(changelog[packageName]);
  if (versions.length === 0) return null;

  // Find the latest version by published date
  let latestVersion = versions[0];
  let latestDate = changelog[packageName][versions[0]].published_date || 0;

  versions.forEach((ver) => {
    const publishedDate = changelog[packageName][ver].published_date || 0;
    if (publishedDate > latestDate) {
      latestDate = publishedDate;
      latestVersion = ver;
    }
  });

  return latestVersion;
};
const getEffectiveVersion = (changelog, packageName, requestedVersion) => {
  // If requested version exists, use it
  if (changelog[packageName]?.[requestedVersion]) {
    return requestedVersion;
  }

  // Otherwise, fallback to latest version
  return findLatestPackageVersion(changelog, packageName);
};
const getPackageVersion = (packageName, alongWithData, changelog) => {
  // Priority 1: Check alongWith data
  if (alongWithData[packageName]) {
    return alongWithData[packageName];
  }

  // Priority 2: Find latest version in changelog
  return findLatestPackageVersion(changelog, packageName);
};
//Comparison Logic
const determinePackageStatus = (versionA, versionB, dataA, dataB) => {
  if (!dataA && dataB) {
    return {status: 'Added', changeClass: 'only-in-b'};
  }

  if (dataA && !dataB) {
    return {status: 'Removed', changeClass: 'only-in-a'};
  }

  if (versionA !== versionB) {
    return {status: 'Version Changed', changeClass: 'version-changed'};
  }

  return {status: 'Unchanged', changeClass: 'unchanged'};
};
const createPackageComparisonRow = (packageName, versionA, versionB, statusInfo) => {
  return {
    packageName,
    versionA: versionA || 'N/A',
    versionB: versionB || 'N/A',
    status: statusInfo.status,
    changeClass: statusInfo.changeClass,
  };
};
const calculateComparisonStats = (packages) => {
  const stats = {
    changedCount: 0,
    unchangedCount: 0,
    onlyInACount: 0,
    onlyInBCount: 0,
  };

  packages.forEach((pkg) => {
    switch (pkg.status) {
      case 'Version Changed':
        stats.changedCount++;
        break;
      case 'Unchanged':
        stats.unchangedCount++;
        break;
      case 'Removed':
        stats.onlyInACount++;
        break;
      case 'Added':
        stats.onlyInBCount++;
        break;
    }
  });

  return stats;
};

const buildPackagesList = (
  mainPackage,
  effectiveVersionA,
  effectiveVersionB,
  pkgDataA,
  pkgDataB,
  changelogA,
  changelogB
) => {
  const packagesArray = [];

  // Add main package row
  const mainStatus = determinePackageStatus(effectiveVersionA, effectiveVersionB, pkgDataA, pkgDataB);
  packagesArray.push(createPackageComparisonRow(mainPackage, effectiveVersionA, effectiveVersionB, mainStatus));

  // Get alongWith data
  const alongWithA = pkgDataA?.alongWith || {};
  const alongWithB = pkgDataB?.alongWith || {};

  // Get all packages from both changelogs
  const allPackages = new Set([...Object.keys(changelogA), ...Object.keys(changelogB)]);

  // Remove main package (already added)
  allPackages.delete(mainPackage);

  // Add comparison rows for all related packages
  allPackages.forEach((pkg) => {
    const pkgVerA = getPackageVersion(pkg, alongWithA, changelogA);
    const pkgVerB = getPackageVersion(pkg, alongWithB, changelogB);

    const statusInfo = determinePackageStatus(
      pkgVerA,
      pkgVerB,
      pkgVerA ? {} : null, // Simplified - just check if version exists
      pkgVerB ? {} : null
    );

    packagesArray.push(createPackageComparisonRow(pkg, pkgVerA, pkgVerB, statusInfo));
  });

  // Sort packages alphabetically
  packagesArray.sort((a, b) => a.packageName.localeCompare(b.packageName));

  return packagesArray;
};
const comparePackages = (packagesA, packagesB, changelogA, changelogB, stableVersionA, stableVersionB) => {
  // Get ALL package names from both changelogs (entire changelog, not just specific versions)
  const allPackageNames = new Set([
    ...Object.keys(changelogA), //ALL packages in changelog A
    ...Object.keys(changelogB), //ALL packages in changelog B
  ]);

  const packages = [];
  let changedCount = 0;
  let unchangedCount = 0;
  let onlyInACount = 0;
  let onlyInBCount = 0;

  // Helper function to find stable version first, then highest pre-release version
  const findStableVersion = (changelog, packageName, stableVersion) => {
    if (!changelog[packageName]) return null;

    const versions = Object.keys(changelog[packageName]);
    if (versions.length === 0) return null;

    // Escape dots in version string for regex (3.4.0 -> 3\.4\.0)
    const escapedVersion = stableVersion.replace(/\./g, '\\.');

    // Priority 1: Find exact stable version (e.g., "3.4.0" only, no suffixes)
    const exactStablePattern = new RegExp(`^${escapedVersion}$`);
    const exactStableVersion = versions.find((ver) => exactStablePattern.test(ver));

    if (exactStableVersion) {
      return exactStableVersion;
    }

    // Priority 2: Find highest pre-release version (any tag: next, alpha, beta, rc, etc.)
    // Pattern: 3.4.0-{tag}.{number} -> captures tag and number
    const prereleasePattern = new RegExp(`^${escapedVersion}-([a-z]+)\\.(\\d+)$`, 'i');

    const prereleaseVersions = versions
      .filter((ver) => prereleasePattern.test(ver))
      .sort((a, b) => {
        const matchA = a.match(prereleasePattern);
        const matchB = b.match(prereleasePattern);
        console.log('Package:', packageName, '| matchA:', matchA, '| matchB:', matchB);
        if (!matchA || !matchB) return 0;

        const numA = parseInt(matchA[2], 10);
        const numB = parseInt(matchB[2], 10);        console.log('numB', numB);
        return numA - numB; // Sort ascending (lowest first)
      });
    console.log('prereleaseVersions', prereleaseVersions);
    console.log('versions', versions);
    // Return highest pre-release version, or fallback to first available
    return prereleaseVersions[0] || versions[0];
  };

  allPackageNames.forEach((packageName) => {
    // Use release version per stable train (exact stable or highest prerelease), not chronologically earliest
    const versionA = findStableVersion(changelogA, packageName, stableVersionA);
    const versionB = findStableVersion(changelogB, packageName, stableVersionB);

    let status, changeClass; //Declare variables for status label and CSS class

    if (versionA && versionB) {
      //checks if package is in both changelogs
      if (versionA === versionB) {
        //if versionA is the same as versionB, then it is unchanged
        status = 'Unchanged';
        changeClass = 'unchanged';
        unchangedCount++;
      } else {
        status = 'Version Changed';
        changeClass = 'version-changed';
        changedCount++;
      }
    } else if (versionA && !versionB) {
      status = 'Removed';
      changeClass = 'only-in-a';
      onlyInACount++;
    } else if (!versionA && versionB) {
      status = 'Added';
      changeClass = 'only-in-b';
      onlyInBCount++;
    }

    packages.push({
      packageName,
      versionA: versionA || 'N/A',
      versionB: versionB || 'N/A',
      status,
      changeClass,
    });
  });

  // Sort packages alphabetically
  packages.sort((a, b) => a.packageName.localeCompare(b.packageName));

  return {
    packages,
    totalPackages: allPackageNames.size,
    changedCount,
    unchangedCount,
    onlyInACount,
    onlyInBCount,
  };
};

//Data Fetching
const fetchAndCompareVersions = async (versionA, versionB, versionPaths) => {
  const [changelogA, changelogB] = await Promise.all([
    fetch(versionPaths[versionA]).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${versionA}`);
      return res.json();
    }),
    fetch(versionPaths[versionB]).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${versionB}`);
      return res.json();
    }),
  ]);

  // Extract packages from both versions
  const packagesA = extractPackagesFromVersion(changelogA);
  const packagesB = extractPackagesFromVersion(changelogB);

  // Compare packages
  const comparisonData = comparePackages(packagesA, packagesB, changelogA, changelogB, versionA, versionB);

  return {
    versionA,
    versionB,
    comparisonData,
  };
};
const generatePackageComparisonData = (packageName, versionASpecific, versionBSpecific, changelogA, changelogB) => {
  const effectiveVersionA = getEffectiveVersion(changelogA, packageName, versionASpecific);
  const effectiveVersionB = getEffectiveVersion(changelogB, packageName, versionBSpecific);
  console.log('effectiveVersionA', effectiveVersionA);
  console.log('effectiveVersionB', effectiveVersionB);
  // Get package data from changelogs
  const pkgDataA = changelogA[packageName]?.[effectiveVersionA];
  const pkgDataB = changelogB[packageName]?.[effectiveVersionB];
  console.log('pkgDataA', pkgDataA);
  console.log('pkgDataB', pkgDataB);

  // Validate versions exist
  if (!pkgDataA && !pkgDataB) {
    throw new Error(`Could not find version data for ${packageName}`);
  }

  // Build packages list including main package and all related packages
  const packagesArray = buildPackagesList(
    packageName,
    effectiveVersionA,
    effectiveVersionB,
    pkgDataA,
    pkgDataB,
    changelogA,
    changelogB
  );

  // Calculate statistics
  const stats = calculateComparisonStats(packagesArray);

  // Return pure data object
  return {
    packageName,
    versionA: effectiveVersionA,
    versionB: effectiveVersionB,
    packages: packagesArray,
    totalPackages: packagesArray.length,
    ...stats,
  };
};
//Export All the functions
export {
  comparisonState,
  extractPackagesFromVersion,
  findLatestPackageVersion,
  getEffectiveVersion,
  getPackageVersion,
  determinePackageStatus,
  createPackageComparisonRow,
  calculateComparisonStats,
  buildPackagesList,
  comparePackages,
  fetchAndCompareVersions,
  generatePackageComparisonData,
};
