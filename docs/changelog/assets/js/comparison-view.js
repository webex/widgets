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
/* ============================================
   COMMIT HISTORY — CROSS-STABLE COLLECTION
   Walk every stable version between stableA and stableB,
   open each log file, and collect commits per the rules below.
   ============================================ */

const sortStableVersions = (versions) =>
  [...versions].sort((a, b) => {
    const p = (v) => v.split('.').map(Number);
    const [aMaj, aMin, aPatch] = p(a);
    const [bMaj, bMin, bPatch] = p(b);
    return aMaj !== bMaj ? aMaj - bMaj : aMin !== bMin ? aMin - bMin : aPatch - bPatch;
  });

const isPreRelease = (version, stableVersion) => {
  const escaped = stableVersion.replace(/\./g, '\\.');
  return new RegExp(`^${escaped}-`).test(version);
};

const isExactStable = (version) => /^\d+\.\d+\.\d+$/.test(version);

const getPreReleaseNum = (version) => {
  const match = version.match(/\.(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
};

const getPreReleaseTag = (version, stableVersion) => {
  return version.slice(stableVersion.length + 1).replace(/\.\d+$/, '');
};

/**
 * Collect commits from one stable version's package data.
 *
 * Rules:
 *  'start'  → from versionA (inclusive) through ALL remaining pre-releases
 *  'middle' → skip exact stable entry; ALL pre-releases of this stable
 *  'end'    → ALL pre-releases from next.1 up to versionB (inclusive)
 *  'only'   → stableA === stableB; from versionA to versionB within same file
 */
const collectCommitsFromStable = (packageData, stableVersion, versionA, versionB, position) => {
  if (!packageData) return [];
  const all = Object.keys(packageData);
  let versionsToUse = [];

  // Determine the target tag from the user-selected versions
  const targetTag = !isExactStable(versionA)
    ? getPreReleaseTag(versionA, stableVersion)
    : !isExactStable(versionB)
      ? getPreReleaseTag(versionB, stableVersion)
      : null;

  if (position === 'start') {
    if (versionA === stableVersion) {
      versionsToUse = all.filter((v)=>isPreRelease(v,stableVersion));
    } else {
      const tagA = getPreReleaseTag(versionA, stableVersion);
      const numA = getPreReleaseNum(versionA);
      versionsToUse = all.filter((v) => {
        if (!isPreRelease(v, stableVersion)) return false;
        const tag = getPreReleaseTag(v, stableVersion);
        if (tag !== tagA) return false;
        const num = getPreReleaseNum(v);
        return num >= numA;
      });
    }
  } else if (position === 'middle') {
    versionsToUse =
      isExactStable(versionA) && isExactStable(versionB)
        ? []
        : all.filter((v) => {
            if (!isPreRelease(v, stableVersion)) return false;
            if (!targetTag) return true;
            return getPreReleaseTag(v, stableVersion) === targetTag;
          });
  } else if (position === 'end') {
    if (versionB === stableVersion) {
      versionsToUse = [stableVersion];
    } else {
      const tagB = getPreReleaseTag(versionB, stableVersion);
      const numB = getPreReleaseNum(versionB);
      versionsToUse = all.filter((v) => {
        if (!isPreRelease(v, stableVersion)) return false;
        const tag = getPreReleaseTag(v, stableVersion);
        if (tag !== tagB) return false;
        const num = getPreReleaseNum(v);
        return num <= numB;
      });
    }
  } else {
    // 'only' — stableA === stableB
    if (versionA === stableVersion && versionB === stableVersion) {
      versionsToUse = [stableVersion];
    } else if (versionA === stableVersion) {
      const tagB = getPreReleaseTag(versionB, stableVersion);
      const numB = getPreReleaseNum(versionB);
      versionsToUse = all.filter((v) => {
        if (v === stableVersion) return true;
        if (!isPreRelease(v, stableVersion)) return false;
        const tag = getPreReleaseTag(v, stableVersion);
        if (tag !== tagB) return false;
        const num = getPreReleaseNum(v);
        return num <= numB;
      });
    } else {
      const tagA = getPreReleaseTag(versionA, stableVersion);
      const numA = getPreReleaseNum(versionA);
      const tagB = getPreReleaseTag(versionB, stableVersion);
      const numB = getPreReleaseNum(versionB);
      versionsToUse = all.filter((v) => {
        if (!isPreRelease(v, stableVersion)) return false;
        const tag = getPreReleaseTag(v, stableVersion);
        const num = getPreReleaseNum(v);
        const afterStart = tag === tagA ? num >= numA : true;
        const beforeEnd = tag === tagB ? num <= numB : true;
        return afterStart && beforeEnd;
      });
    }
  }

  const seen = new Map();
  versionsToUse.forEach((ver) => {
    Object.entries(packageData[ver]?.commits || {}).forEach(([hash, message]) => {
      if (!seen.has(hash)) {
        seen.set(hash, {
          hash,
          shortHash: hash.substring(0, 7),
          message,
          version: ver,
          stableGroup: stableVersion,
        });
      }
    });
  });
  return Array.from(seen.values());
};

const generatePackageComparisonData = (packageName, versionASpecific, versionBSpecific, changelogA, changelogB) => {
  const effectiveVersionA = getEffectiveVersion(changelogA, packageName, versionASpecific);
  const effectiveVersionB = getEffectiveVersion(changelogB, packageName, versionBSpecific);
  // Get package data from changelogs
  const pkgDataA = changelogA[packageName]?.[effectiveVersionA];
  const pkgDataB = changelogB[packageName]?.[effectiveVersionB];
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
  generatePackageComparisonData,
  sortStableVersions,
  collectCommitsFromStable,
};
