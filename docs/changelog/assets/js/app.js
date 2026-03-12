// Global variable to store the current changelog and version paths
let currentChangelog;
const versionPaths = {};
let comparisonListenersInitialized = false;
const githubBaseUrl = 'https://github.com/webex/widgets/';

// DOM elements
const versionSelectDropdown = document.getElementById('version-select');
const packageNameInputDropdown = document.getElementById('package-name-input');
const packageInputGroup = document.getElementById('package-input-group');
const versionInput = document.getElementById('version-input');
const versionInputError = document.getElementById('version-input-error');
const versionInputGroup = document.getElementById('version-input-group');
const commitMessageInput = document.getElementById('commit-message-input');
const commitMessageGroup = document.getElementById('commit-message-group');
const commitHashInput = document.getElementById('commit-hash-input');
const commitHashGroup = document.getElementById('commit-hash-group');
const searchForm = document.getElementById('search-form');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');

// DOM elements - Comparison Mode
const comparisonResults = document.getElementById('comparison-results');
const comparisonTemplateElement = document.getElementById('comparison-template');
const comparisonForm = document.getElementById('comparison-form');
const singleViewBtn = document.getElementById('single-view-btn');
const comparisonViewBtn = document.getElementById('comparison-view-btn');
const versionASelect = document.getElementById('version-a-select');
const versionBSelect = document.getElementById('version-b-select');
const comparisonPackageSelect = document.getElementById('comparison-package-select');
const comparisonPackageRow = document.getElementById('comparison-package-row');
const versionAPrereleaseSelect = document.getElementById('version-a-prerelease-select');
const versionBPrereleaseSelect = document.getElementById('version-b-prerelease-select');
const prereleaseRow = document.getElementById('comparison-prerelease-row');
const compareButton = document.getElementById('compare-button');
const clearComparisonButton = document.getElementById('clear-comparison-button');
const clearBaseVersionBtn = document.getElementById('clear-base-version');
const clearTargetVersionBtn = document.getElementById('clear-target-version');
const copyComparisonLinkBtn = document.getElementById('copy-comparison-link');
const comparisonHelper = document.getElementById('comparison-helper');
const changelogFormContainer = document.getElementById('changelog-form-container');

// DOM elements - Shared
const helperSection = document.getElementById('helper-section');
const packageLevelSection = document.getElementById('package-level-comparison-section');

// Centralized UI visibility: map of view state -> which elements are visible/hidden
const uiViewElements = {
  searchForm,
  comparisonForm,
  searchResults,
  comparisonResults,
  helperSection,
  comparisonHelper,
};

const uiVisibilityStates = {
  search: {
    visible: ['searchForm', 'searchResults', 'helperSection'],
    hidden: ['comparisonForm', 'comparisonResults', 'comparisonHelper'],
  },
  comparison: {
    visible: ['comparisonForm', 'comparisonHelper'],
    hidden: ['searchForm', 'searchResults', 'helperSection', 'comparisonResults'],
  },
};

/* ========== Version Comparison – data extraction and comparison logic (inlined from single app) ========== */
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
    if (!packageVersions || typeof packageVersions !== 'object') continue;
    const versionKeys = Object.keys(packageVersions);
    if (versionKeys.length === 0) continue;
    let selectedVersion = null;
    if (specificVersions && specificVersions[packageName]) {
      const requestedVersion = specificVersions[packageName];
      if (packageVersions[requestedVersion]) selectedVersion = requestedVersion;
    }
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
  if (changelog[packageName]?.[requestedVersion]) return requestedVersion;
  return findLatestPackageVersion(changelog, packageName);
};

const getPackageVersion = (packageName, alongWithData, changelog) => {
  if (alongWithData[packageName]) return alongWithData[packageName];
  return findLatestPackageVersion(changelog, packageName);
};

const determinePackageStatus = (versionA, versionB, dataA, dataB) => {
  if (!dataA && dataB) return { status: 'Added', changeClass: 'only-in-b' };
  if (dataA && !dataB) return { status: 'Removed', changeClass: 'only-in-a' };
  if (versionA !== versionB) return { status: 'Version Changed', changeClass: 'version-changed' };
  return { status: 'Unchanged', changeClass: 'unchanged' };
};

const createPackageComparisonRow = (packageName, versionA, versionB, statusInfo) => ({
  packageName,
  versionA: versionA || 'N/A',
  versionB: versionB || 'N/A',
  status: statusInfo.status,
  changeClass: statusInfo.changeClass,
});

const calculateComparisonStats = (packages) => {
  const stats = { changedCount: 0, unchangedCount: 0, onlyInACount: 0, onlyInBCount: 0 };
  packages.forEach((pkg) => {
    switch (pkg.status) {
      case 'Version Changed': stats.changedCount++; break;
      case 'Unchanged': stats.unchangedCount++; break;
      case 'Removed': stats.onlyInACount++; break;
      case 'Added': stats.onlyInBCount++; break;
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
  const mainStatus = determinePackageStatus(effectiveVersionA, effectiveVersionB, pkgDataA, pkgDataB);
  packagesArray.push(createPackageComparisonRow(mainPackage, effectiveVersionA, effectiveVersionB, mainStatus));
  const alongWithA = pkgDataA?.alongWith || {};
  const alongWithB = pkgDataB?.alongWith || {};
  const allPackages = new Set([...Object.keys(changelogA), ...Object.keys(changelogB)]);
  allPackages.delete(mainPackage);
  allPackages.forEach((pkg) => {
    const pkgVerA = getPackageVersion(pkg, alongWithA, changelogA);
    const pkgVerB = getPackageVersion(pkg, alongWithB, changelogB);
    const statusInfo = determinePackageStatus(pkgVerA, pkgVerB, pkgVerA ? {} : null, pkgVerB ? {} : null);
    packagesArray.push(createPackageComparisonRow(pkg, pkgVerA, pkgVerB, statusInfo));
  });
  packagesArray.sort((a, b) => a.packageName.localeCompare(b.packageName));
  return packagesArray;
};

const comparePackages = (packagesA, packagesB, changelogA, changelogB, stableVersionA, stableVersionB) => {
  const allPackageNames = new Set([...Object.keys(changelogA), ...Object.keys(changelogB)]);
  const packages = [];
  let changedCount = 0, unchangedCount = 0, onlyInACount = 0, onlyInBCount = 0;

  const findStableVersion = (changelog, packageName, stableVersion) => {
    if (!changelog[packageName]) return null;
    const versions = Object.keys(changelog[packageName]);
    if (versions.length === 0) return null;
    const escapedVersion = stableVersion.replace(/\./g, '\\.');
    const exactStablePattern = new RegExp(`^${escapedVersion}$`);
    const exactStableVersion = versions.find((ver) => exactStablePattern.test(ver));
    if (exactStableVersion) return exactStableVersion;
    const prereleasePattern = new RegExp(`^${escapedVersion}-([a-z]+)\\.(\\d+)$`, 'i');
    const prereleaseVersions = versions
      .filter((ver) => prereleasePattern.test(ver))
      .sort((a, b) => {
        const matchA = a.match(prereleasePattern);
        const matchB = b.match(prereleasePattern);
        if (!matchA || !matchB) return 0;
        return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
      });
    return prereleaseVersions[0] || versions[0];
  };

  allPackageNames.forEach((packageName) => {
    const versionA = findStableVersion(changelogA, packageName, stableVersionA);
    const versionB = findStableVersion(changelogB, packageName, stableVersionB);
    let status, changeClass;
    if (versionA && versionB) {
      if (versionA === versionB) {
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
    packages.push({ packageName, versionA: versionA || 'N/A', versionB: versionB || 'N/A', status, changeClass });
  });
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

const fetchAndCompareVersions = async (versionA, versionB, versionPathsMap) => {
  const [changelogA, changelogB] = await Promise.all([
    fetch(versionPathsMap[versionA]).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${versionA}`);
      return res.json();
    }),
    fetch(versionPathsMap[versionB]).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${versionB}`);
      return res.json();
    }),
  ]);
  const packagesA = extractPackagesFromVersion(changelogA);
  const packagesB = extractPackagesFromVersion(changelogB);
  const comparisonData = comparePackages(packagesA, packagesB, changelogA, changelogB, versionA, versionB);
  return { versionA, versionB, comparisonData };
};

const generatePackageComparisonData = (packageName, versionASpecific, versionBSpecific, changelogA, changelogB) => {
  const effectiveVersionA = getEffectiveVersion(changelogA, packageName, versionASpecific);
  const effectiveVersionB = getEffectiveVersion(changelogB, packageName, versionBSpecific);
  const pkgDataA = changelogA[packageName]?.[effectiveVersionA];
  const pkgDataB = changelogB[packageName]?.[effectiveVersionB];
  if (!pkgDataA && !pkgDataB) {
    throw new Error(`Could not find version data for ${packageName}`);
  }
  const packagesArray = buildPackagesList(
    packageName,
    effectiveVersionA,
    effectiveVersionB,
    pkgDataA,
    pkgDataB,
    changelogA,
    changelogB
  );
  const stats = calculateComparisonStats(packagesArray);
  return {
    packageName,
    versionA: effectiveVersionA,
    versionB: effectiveVersionB,
    packages: packagesArray,
    totalPackages: packagesArray.length,
    ...stats,
  };
};
/* ========== End Version Comparison logic ========== */

/**
 * Updates visibility of main UI sections based on view state ('search' | 'comparison').
 * Replaces scattered classList add/remove logic with a single source of truth.
 * @param {'search' | 'comparison'} viewState - The desired view mode
 */
function updateUIVisibility(viewState) {
  const stateConfig = uiVisibilityStates[viewState];
  if (!stateConfig) {
    console.warn(`Unknown view state: "${viewState}"`);
    return;
  }
  stateConfig.hidden.forEach((key) => {
    const el = uiViewElements[key];
    if (el) el.classList.add('hide');
  });
  stateConfig.visible.forEach((key) => {
    const el = uiViewElements[key];
    if (el) el.classList.remove('hide');
  });
}

// Initialize UI to search view on load (single source of truth for visibility)
updateUIVisibility('search');

// Templates and Helpers - Handlebar
const changelogItemTemplate = document.getElementById('changelog-item-template');
var changelogUI = Handlebars.compile(changelogItemTemplate.innerHTML);
Handlebars.registerHelper('forIn', function (object) {
  let returnArray = [];
  for (const prop in object) {
    returnArray.push({key: prop, value: object[prop]});
  }
  return returnArray;
});

Handlebars.registerHelper('json', function (context, packageName, version) {
  const copyElem = {
    ...context,
    [packageName]: version,
  };
  return JSON.stringify(copyElem);
});

Handlebars.registerHelper('github_linking', function (string, type) {
  switch (type) {
    case 'hash':
      return `<a href='${githubBaseUrl}commit/${string}' target='_blank'>${string}</a>`;
    case 'message':
      // if commit message has a pr number, replace that pr number with pr anchor link and send back the transformed commit message
      return string.replace(/#(\d+)/g, `<a href="${githubBaseUrl}pull/$1" target="_blank">#$1</a>`);
  }
});

Handlebars.registerHelper('convertDate', function (timestamp) {
  return `${new Date(timestamp).toDateString()} ${new Date(timestamp).toTimeString()}`;
});

// Util Methods
const populateFormFieldsFromURL = async () => {
  const queryParams = new URLSearchParams(window.location.search);

  // Skip single-view URL handling if comparison parameters are present
  if (
    queryParams.has('compare') ||
    queryParams.has('compareStableA') ||
    (queryParams.has('versionA') && queryParams.has('versionB'))
  ) {
    return; // Comparison mode will handle these parameters
  }

  const searchParams = {
    stable_version: queryParams.get('stable_version'),
    package: queryParams.get('package'),
    version: queryParams.get('version'),
    commitMessage: queryParams.get('commitMessage'),
    commitHash: queryParams.get('commitHash'),
  };

  let hasAtleastOneParam = false;

  if (searchParams.stable_version) {
    versionSelectDropdown.value = searchParams.stable_version;
    await doStableVersionChange({
      stable_version: searchParams.stable_version,
    });
  }

  if (searchParams.package && !packageNameInputDropdown.disabled) {
    packageNameInputDropdown.value = searchParams.package;
    packageNameInputDropdown.dispatchEvent(new Event('change'));
    hasAtleastOneParam = true;
  }

  if (searchParams.version) {
    versionInput.value = searchParams.version;
    hasAtleastOneParam = true;
    validateVersionInput({version: searchParams.version});
  }

  if (searchParams.commitMessage) {
    commitMessageInput.value = searchParams.commitMessage;
    hasAtleastOneParam = true;
  }

  if (searchParams.commitHash) {
    commitHashInput.value = searchParams.commitHash;
    hasAtleastOneParam = true;
  }

  updateFormState(searchParams);

  if (hasAtleastOneParam) {
    doSearch(searchParams);
  }
};

const populateVersions = async () => {
  try {
    const response = await fetch('logs/main.json');
    const data = await response.json();
    let optionsHtml = '<option value="">Select a version</option>'; // Placeholder option

    Object.entries(data).forEach(([version, path]) => {
      versionPaths[version] = path;
      optionsHtml += `<option value="${version}">${version}</option>`;
    });

    versionSelectDropdown.innerHTML = optionsHtml; // Set all options at once

    // Call populateFormFieldsFromURL on page load to populate fields based on URL parameters
    populateFormFieldsFromURL();
  } catch (error) {
    console.error('Error fetching version data:', error);
  }
};
const fetchChangelog = async (versionPath) => {
  try {
    const response = await fetch(versionPath);
    currentChangelog = await response.json();
  } catch (error) {
    console.error('Error fetching changelog:', error);
  }
};

/** Note packages always shown first (match "Available packages" in UI note) */
const NOTE_PACKAGES_ORDER = ['@webex/widgets', '@webex/cc-widgets', '@webex/cc-components'];

const populatePackageNames = (changelog) => {
  let allPackages = Object.keys(changelog || {});

  // Other packages from changelog (excluding Note ones), sorted
  let otherPackages = allPackages.filter((pkg) => !NOTE_PACKAGES_ORDER.includes(pkg));
  otherPackages.sort();

  // Always show @webex/widgets, @webex/cc-widgets, @webex/cc-components first (per Note), then rest
  let sortedPackages = ['separator', ...NOTE_PACKAGES_ORDER, 'separator', ...otherPackages];

  let optionsHtml = '<option value="">Select a package</option>';

  sortedPackages.forEach((packageName) => {
    if (packageName === 'separator') {
      optionsHtml += `<option disabled>──────────</option>`;
      return;
    }
    optionsHtml += `<option value="${packageName}">${packageName}</option>`;
  });
  packageNameInputDropdown.innerHTML = optionsHtml;
};

const doStableVersionChange = async ({stable_version}) => {
  if (stable_version && versionPaths[stable_version]) {
    // Enable the package-name-input dropdown
    packageNameInputDropdown.disabled = false;
    // Fetch the changelog and populate package names
    await fetchChangelog(versionPaths[stable_version]);
    populatePackageNames(currentChangelog);

    updateFormState();
    if (versionInput.value.trim() !== '') {
      validateVersionInput({version: versionInput.value});
    }
  } else {
    // Disable all other form elements if no version is selected
    updateFormState();
  }
};

// Search Form Utils
const validateVersionInput = ({version}) => {
  const stableVersion = versionSelectDropdown.value;
  const expectedPattern = new RegExp(`^${stableVersion}-([a-z\-]*\\.)?\\d+$`, 'i');

  if (version !== '' && !expectedPattern.test(version) && stableVersion !== version) {
    versionInputError.innerText = `Version can be empty or should start with ${stableVersion} and match ${stableVersion}-{tag}.patch_version. Eg: ${stableVersion}-next.1`;
    versionInput.focus();
    searchButton.disabled = true;
  } else {
    versionInputError.innerText = ``;
    searchButton.disabled = false;
  }
};

const updateFormState = (formParams) => {
  // If the stable version is empty, show no more fields and disable the search button
  // If the package name is empty, hide version input and show commit options
  // If the package name is not empty, show all options
  // If one of the commit search options is not empty, hide version input and show commit search options
  // If the version field is not empty, hide the commit search options
  if (formParams === undefined) {
    formParams = {
      stable_version: versionSelectDropdown.value,
      package: packageNameInputDropdown.value,
      version: versionInput.value,
      commitMessage: commitMessageInput.value,
      commitHash: commitHashInput.value,
    };
  }

  const disable = {
    package: false,
    version: false,
    commitMessage: false,
    commitHash: false,
    searchButton: true,
  };

  if (formParams.stable_version === null || formParams.stable_version.trim() === '') {
    disable.package = true;
    disable.version = true;
    disable.commitMessage = true;
    disable.commitHash = true;
    disable.searchButton = true;
  } else {
    disable.package = false;
    disable.commitMessage = false;
    disable.commitHash = false;
  }
  //If the package name is empty, disable the version input
  if (formParams.package === null || formParams.package.trim() === '') {
    disable.version = true;
  } else {
    disable.searchButton = false;
  }
  //     If version filled → disable commit fields
  // If commit fields filled → disable version input
  if (formParams.version && formParams.version.trim() !== '') {
    disable.version = false;
    disable.commitMessage = true;
    disable.commitHash = true;
    disable.searchButton = false;
  } else if (
    (formParams.commitMessage && formParams.commitMessage.trim() !== '') ||
    (formParams.commitHash && formParams.commitHash.trim() !== '')
  ) {
    disable.version = true;
    disable.searchButton = false;
  }

  for (let key in disable) {
    switch (key) {
      case 'package':
        if (disable[key]) {
          packageNameInputDropdown.disabled = true;
          packageNameInputDropdown.value = '';
          packageInputGroup.classList.add('hide');
          formParams.package = null;
        } else {
          packageNameInputDropdown.disabled = false;
          packageInputGroup.classList.remove('hide');
        }
        break;
      case 'version':
        if (disable[key]) {
          versionInput.disabled = true;
          versionInput.value = '';
          versionInputGroup.classList.add('hide');
          formParams.version = null;
        } else {
          versionInput.disabled = false;
          versionInputGroup.classList.remove('hide');
        }
        break;
      case 'commitMessage':
        if (disable[key]) {
          commitMessageInput.disabled = true;
          commitMessageInput.value = '';
          commitMessageGroup.classList.add('hide');
          formParams.commitMessage = null;
        } else {
          commitMessageInput.disabled = false;
          commitMessageGroup.classList.remove('hide');
        }
        break;
      case 'commitHash':
        if (disable[key]) {
          commitHashInput.disabled = true;
          commitHashInput.value = '';
          commitHashGroup.classList.add('hide');
          formParams.commitHash = null;
        } else {
          commitHashInput.disabled = false;
          commitHashGroup.classList.remove('hide');
        }
        break;
      case 'searchButton':
        searchButton.disabled = disable[key];
        break;
    }
  }
};
// Search changelog by commit message or hash.(A single commit can appear in multiple package versions.)
const doSearch_commit = (searchParams, drillDown) => {
  let resultingVersions = new Set(),
    resultingCommitMessages = new Set(),
    resultingCommitHash = new Set(),
    searchResults = [];
  for (let packageName in drillDown) {
    const thisPackage = drillDown[packageName];
    for (let version in thisPackage) {
      const thisVersion = thisPackage[version];
      let allHashes = new Set(),
        discontinueSearch = false;
      for (let hash in thisVersion.commits) {
        const thisCommit = thisVersion.commits[hash];
        if (discontinueSearch) {
          resultingVersions.add(`${packageName}-${version}`);
          resultingCommitMessages.add(thisCommit);
          allHashes.forEach((h) => resultingCommitHash.add(h));
        } else {
          allHashes.add(hash);
          if (
            !resultingVersions.has(`${packageName}-${version}`) &&
            !resultingCommitMessages.has(thisCommit) &&
            !resultingCommitHash.has(hash)
          ) {
            if (
              (searchParams.commitMessage &&
                searchParams.commitMessage.trim() !== '' &&
                thisCommit.includes(searchParams.commitMessage.trim())) ||
              (searchParams.commitHash &&
                (hash.includes(searchParams.commitHash) || searchParams.commitHash.startsWith(hash)))
            ) {
              resultingVersions.add(`${packageName}-${version}`);
              resultingCommitMessages.add(thisCommit);
              allHashes.forEach((h) => resultingCommitHash.add(h));
              allHashes = new Set();
              discontinueSearch = true;
              searchResults.push({
                packageName,
                version,
                published_date: thisVersion.published_date,
                commits: thisVersion.commits,
                alongWith: thisVersion.alongWith,
              });
            }
          }
        }
      }
    }
  }
  return searchResults;
};

const doSearch = (searchParams) => {
  const pkg = searchParams.package;
  const version = searchParams.version;
  let drillDown = {...currentChangelog},
    shouldTransform = true,
    results = [];
  // If package selected → filter to that package
  if (pkg !== null && pkg?.trim() !== '') {
    drillDown = {
      [pkg]: drillDown[pkg],
    };
  }

  // If version selected → filter to that version (only when package and version exist)
  if (version !== null && version?.trim() !== '') {
    if (pkg && drillDown[pkg] && drillDown[pkg][version]) {
      drillDown = {
        [pkg]: {
          [version]: drillDown[pkg][version],
        },
      };
    } else {
      drillDown = {};
    }
  } else if (
    (searchParams.commitMessage !== null && searchParams.commitMessage?.trim() !== '') ||
    (searchParams.commitHash !== null && searchParams.commitHash?.trim() !== '')
  ) {
    results = doSearch_commit(searchParams, drillDown);
    shouldTransform = false;
  }

  if (shouldTransform) {
    Object.keys(drillDown).forEach((pkg) => {
      const versions = drillDown[pkg];
      if (versions != null && typeof versions === 'object') {
        Object.keys(versions).forEach((ver) => {
          results.push({
            package: pkg,
            version: ver,
            published_date: versions[ver].published_date,
            commits: versions[ver].commits,
            alongWith: versions[ver].alongWith,
          });
        });
      }
    });
  }

  // sort search results based on published date (Unix timestamp)
  results.sort((a, b) => b.published_date - a.published_date);

  const searchResultsHtml = changelogUI({
    data: {
      search_results: results,
      stable_version: searchParams.stable_version,
    },
  });

  searchResults.innerHTML = searchResultsHtml;
  searchResults.classList.remove('hide');
};

// Event listeners
versionSelectDropdown.addEventListener('change', (event) =>
  doStableVersionChange({stable_version: event.target.value})
);

[versionInput, commitHashInput, commitMessageInput].forEach((element) => {
  element.addEventListener('keyup', () => updateFormState());
});

packageNameInputDropdown.addEventListener('change', () => updateFormState());

versionInput.addEventListener('keyup', (event) => validateVersionInput({version: event.target.value}));

searchForm.addEventListener('submit', (event) => {
  // Prevent the default form submission
  event.preventDefault();

  // Construct the query string only with non-empty values
  const queryParams = new URLSearchParams();
  if (versionSelectDropdown.value) {
    queryParams.set('stable_version', versionSelectDropdown.value);
  }
  if (packageNameInputDropdown.value) {
    queryParams.set('package', packageNameInputDropdown.value);
  }
  if (versionInput.value) {
    queryParams.set('version', versionInput.value);
  }
  if (commitMessageInput.value) {
    queryParams.set('commitMessage', commitMessageInput.value);
  }
  if (commitHashInput.value) {
    queryParams.set('commitHash', commitHashInput.value);
  }

  // Redirect to the same page with the query string
  window.history.pushState({}, 'Cisco Webex Widgets', `${window.location.pathname}?${queryParams.toString()}`);
  populateVersions();
});

const copyToClipboard = (copyButton) => {
  let textToCopy;
  try {
    textToCopy = JSON.stringify(JSON.parse(copyButton.dataset.alongWith), null, 4);
  } catch (e) {
    console.error('copyToClipboard: invalid data-along-with', e);
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showCopySuccess(copyButton))
      .catch((err) => {
        console.error('Clipboard API failed:', err);
        fallbackCopyToClipboard(textToCopy, copyButton);
      });
  } else {
    fallbackCopyToClipboard(textToCopy, copyButton);
  }
};

/**
 * Copy comparison link to clipboard
 * Global function that can be called from HTML or JS
 */
const copyComparisonLink = () => {
  const currentURL = window.location.href;

  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(currentURL)
      .then(() => {
        showCopySuccess(copyComparisonLinkBtn);
      })
      .catch((err) => {
        console.error('Clipboard API failed:', err);
        fallbackCopyToClipboard(currentURL, copyComparisonLinkBtn);
      });
  } else {
    fallbackCopyToClipboard(currentURL, copyComparisonLinkBtn);
  }
};
window.copyToClipboard = copyToClipboard;
window.copyComparisonLink = copyComparisonLink;
/**
 * Show success feedback on copy button
 */
const showCopySuccess = (button) => {
  if (!button) return;

  const originalText = button.innerHTML;
  button.innerHTML = '✓ Link Copied!';
  button.style.backgroundColor = 'var(--color-success)';
  button.style.borderColor = 'var(--color-success)';

  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.backgroundColor = '';
    button.style.borderColor = '';
  }, 2000);
};

/**
 * Fallback copy method for browsers without Clipboard API (Older browsers don't support navigator.clipboard)
 */
const fallbackCopyToClipboard = (text, button) => {
  // Create temporary input element
  const tempInput = document.createElement('input');
  tempInput.style.position = 'fixed';
  tempInput.style.opacity = '0';
  tempInput.value = text;
  document.body.appendChild(tempInput);

  // Select and copy
  tempInput.select();
  tempInput.setSelectionRange(0, 99999); // For mobile devices

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopySuccess(button);
    } else {
      console.error('execCommand copy failed');
      showCopyError(button);
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyError(button);
  }

  // Remove temporary input
  document.body.removeChild(tempInput);
};

/**
 * Show error feedback
 */
const showCopyError = (button) => {
  if (!button) {
    alert('Could not copy link. Please copy manually from the address bar.');
    return;
  }

  const originalText = button.innerHTML;
  button.innerHTML = 'Copy Failed';
  button.style.backgroundColor = 'var(--color-danger)';
  button.style.borderColor = 'var(--color-danger)';

  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.backgroundColor = '';
    button.style.borderColor = '';
  }, 2000);

  // Also show alert with instructions
  setTimeout(() => {
    alert('Could not copy link automatically.\n\nPlease copy manually from the address bar:\n' + window.location.href);
  }, 100);
};

window.onhashchange = () => {
  populateVersions();
};

populateVersions();

let comparisonMode = false;
/* ============================================
   UI HELPER FUNCTIONS
   ============================================ */

/**
 * Show loading state for comparison
 */
const showComparisonLoading = () => {
  if (!comparisonResults) return;
  comparisonResults.innerHTML = '<p style="text-align: center; padding: 20px;">Loading comparison...</p>';
  comparisonResults.classList.remove('hide');
};

/**
 * Show error state for comparison
 * @param {Error} error - The error object
 */
const showComparisonError = (error) => {
  if (!comparisonResults) return;

  console.error('Error performing version comparison:', error);
  console.error('Error stack:', error.stack);

  comparisonResults.innerHTML = `<div style="color: var(--color-error-text); padding: 20px; background: var(--color-error-bg); border-radius: 5px;">
            <strong>Error:</strong> Failed to compare versions. ${error.message}
            <br><br><small>Check browser console for details (F12)</small>
        </div>`;
};

/* ============================================
   DATA LAYER FUNCTIONS
   ============================================ */

/**
 * UI LAYER: Handle version comparison UI updates
 * @param {string} versionA - Base version
 * @param {string} versionB - Target version
 */
const performVersionComparison = async (versionA, versionB) => {
  // Show loading state
  showComparisonLoading();

  try {
    // Fetch and compare data (pure data logic)
    const result = await fetchAndCompareVersions(versionA, versionB, versionPaths);

    // Display results (UI logic)
    displayComparison(result.versionA, result.versionB, result.comparisonData);
  } catch (error) {
    // Handle error display (UI logic)
    showComparisonError(error);
  }
};

/**
 * Display comparison results
 * @param {string} versionA - Base version
 * @param {string} versionB - Target version
 * @param {Object} comparisonData - Comparison results
 */
const displayComparison = (versionA, versionB, comparisonData) => {
  if (!comparisonResults) {
    console.error('comparison-results element not found!');
    return;
  }

  if (!comparisonTemplateElement) {
    console.error('comparison-template element not found!');
    return;
  }

  const comparisonTemplate = Handlebars.compile(comparisonTemplateElement.innerHTML);

  const templateData = {
    versionA,
    versionB,
    ...comparisonData,
  };

  console.log('Template data:', templateData);

  try {
    const html = comparisonTemplate(templateData);
    console.log('Generated HTML length:', html.length);

    comparisonResults.innerHTML = html;
    comparisonResults.classList.remove('hide');

    // Update URL with comparison parameters for permalinks
    updateComparisonURL(versionA, versionB);

    // Show the copy link button and helper text
    if (copyComparisonLinkBtn) {
      copyComparisonLinkBtn.classList.remove('hide');
      console.log('Copy link button shown');
    } else {
      console.warn('Copy link button not found in DOM');
    }
    if (comparisonHelper) {
      comparisonHelper.classList.remove('hide');
    }

    // Scroll to results smoothly
    setTimeout(() => {
      comparisonResults.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 100);

    console.log('Comparison displayed successfully');
  } catch (error) {
    console.error('Error rendering template:', error);
    comparisonResults.innerHTML = `<div style="color: var(--color-error-text); padding: 20px; background: var(--color-error-bg); border-radius: 5px;">Error rendering comparison: ${error.message}</div>`;
  }
};

/**
 * Update URL with comparison parameters for sharing/bookmarking
 * @param {string} versionA - Base version
 * @param {string} versionB - Target version
 */
const updateComparisonURL = (versionA, versionB) => {
  const url = new URL(window.location);

  // Clear any single-view parameters
  url.searchParams.delete('stable_version');
  url.searchParams.delete('package');
  url.searchParams.delete('version');
  url.searchParams.delete('commitMessage');
  url.searchParams.delete('commitHash');
  // Clear enhanced (package-level) comparison params so full comparison link is not stale
  url.searchParams.delete('compareStableA');
  url.searchParams.delete('compareStableB');
  url.searchParams.delete('comparePackage');
  url.searchParams.delete('compareVersionA');
  url.searchParams.delete('compareVersionB');


  // Set comparison parameters
  url.searchParams.set('compare', `${versionA}vs${versionB}`);

  // Update URL without reloading the page
  window.history.pushState({}, '', url);
};

/**
 * Parse and handle comparison URL parameters
 * Supports formats: ?compare=3.9.0vs3.10.0 or ?versionA=3.9.0&versionB=3.10.0
 */
const handleComparisonURLParams = async () => {
  const urlParams = new URLSearchParams(window.location.search);

  let versionA = null;
  let versionB = null;

  // Check for ?compare=AvB format
  const compareParam = urlParams.get('compare');
  if (compareParam && compareParam.includes('vs')) {
    const versions = compareParam.split('vs');
    versionA = versions[0]?.trim();
    versionB = versions[1]?.trim();
  }

  // Also support ?versionA=X&versionB=Y format
  if (!versionA) versionA = urlParams.get('versionA');
  if (!versionB) versionB = urlParams.get('versionB');

  // If comparison parameters are found, switch to comparison mode
  if (versionA && versionB && versionA !== versionB) {
    return {versionA, versionB, shouldCompare: true};
  }

  return {shouldCompare: false};
};

/**
 * Switch to comparison mode programmatically
 * @param {string} versionA - Base version (optional)
 * @param {string} versionB - Target version (optional)
 */
const switchToComparisonMode = (versionA = null, versionB = null) => {
  // Update mode
  comparisonMode = true;

  // Update button states
  if (comparisonViewBtn && singleViewBtn) {
    comparisonViewBtn.classList.add('active', 'btn-primary');
    comparisonViewBtn.classList.remove('btn-default');
    singleViewBtn.classList.remove('active', 'btn-primary');
    singleViewBtn.classList.add('btn-default');
  }

  // Update form visibility (centralized view state)
  updateUIVisibility('comparison');
  // Full-width form layout in comparison mode (same as when user clicks Version Comparison)
  if (changelogFormContainer) changelogFormContainer.classList.add('comparison-form-full-width');
  // Hide package-level comparison section in version comparison mode
  if (packageLevelSection) packageLevelSection.classList.add('hide');
  // Pre-release row only shown after base and target are selected
  if (prereleaseRow) prereleaseRow.style.display = 'none';

  // Populate version dropdowns
  if (versionSelectDropdown && versionSelectDropdown.innerHTML) {
    const options = versionSelectDropdown.innerHTML;
    if (versionASelect) versionASelect.innerHTML = options;
    if (versionBSelect) versionBSelect.innerHTML = options;
  }

  // Set selected versions if provided
  if (versionA && versionASelect) versionASelect.value = versionA;
  if (versionB && versionBSelect) versionBSelect.value = versionB;
};

/* ============================================
   ENHANCED VERSION COMPARISON HELPERS
   ============================================ */

/**
 * Get union of packages from both versions (all packages that exist in either version)
 * @param {Object} changelogA - Changelog data for version A
 * @param {Object} changelogB - Changelog data for version B
 * @returns {Array} - Array of all package names (union)
 */
const getUnionPackages = (changelogA, changelogB) => {
  const packagesA = new Set(Object.keys(changelogA));
  const packagesB = new Set(Object.keys(changelogB));

  // Create union of both package sets
  const allPackages = new Set([...packagesA, ...packagesB]);

  // Prioritize certain packages
  const specialPackages = ['@webex/widgets', '@webex/cc-widgets'];
  const filtered = [...allPackages].filter((pkg) => !specialPackages.includes(pkg));
  filtered.sort();

  return [...specialPackages.filter((pkg) => allPackages.has(pkg)), ...filtered];
};

/**
 * Full package list for Version Comparison dropdown (always show this exact list, per Note + related packages).
 */
const COMPARISON_PACKAGE_LIST = [
  '@webex/widgets',
  '@webex/cc-widgets',
  '@webex/cc-components',
  '@webex/cc-digital-channels',
  '@webex/cc-station-login',
  '@webex/cc-store',
  '@webex/cc-task',
  '@webex/cc-ui-logging',
  '@webex/cc-user-state',
  '@webex/test-fixtures',
  'samples-cc-react-app',
  'samples-cc-wc-app',
  'samples-meeting-app',
];

/**
 * Enable or disable Base/Target version dropdowns only (clear buttons are controlled separately).
 */
const setBaseTargetVersionDisabled = (disabled) => {
  if (versionASelect) versionASelect.disabled = disabled;
  if (versionBSelect) versionBSelect.disabled = disabled;
};

/**
 * Enable or disable the clear (X) buttons next to Base and Target version (disabled only when no package selected).
 * After base and target are selected, clear buttons stay enabled so user can clear and pick different versions.
 */
const setComparisonClearButtonsDisabled = (disabled) => {
  if (clearBaseVersionBtn) clearBaseVersionBtn.disabled = disabled;
  if (clearTargetVersionBtn) clearTargetVersionBtn.disabled = disabled;
};

/**
 * Populate Version Comparison package dropdown with the full package list (no dependency on changelog).
 */
const populateComparisonPackagesInitial = async () => {
  if (!comparisonPackageSelect || !comparisonPackageRow) return;
  let optionsHtml = '<option value="">Select a package</option>';
  COMPARISON_PACKAGE_LIST.forEach((pkg) => {
    optionsHtml += `<option value="${pkg}">${pkg}</option>`;
  });
  comparisonPackageSelect.innerHTML = optionsHtml;
  comparisonPackageRow.style.display = 'flex';
  setBaseTargetVersionDisabled(true);
  setComparisonClearButtonsDisabled(true);
};

/**
 * UI LAYER: Compare specific package versions and render results
 * @param {string} packageName - Package name
 * @param {string} versionASpecific - Version A
 * @param {string} versionBSpecific - Version B
 * @param {Object} changelogA - Changelog A
 * @param {Object} changelogB - Changelog B
 */
const compareAndRenderPackageVersions = (packageName, versionASpecific, versionBSpecific, changelogA, changelogB) => {
  try {
    // Generate comparison data
    const comparisonData = generatePackageComparisonData(
      packageName,
      versionASpecific,
      versionBSpecific,
      changelogA,
      changelogB
    );

    console.log('comparisonData', comparisonData);

    // Validate DOM elements
    if (!comparisonResults) {
      console.error('comparison-results element not found');
      return;
    }

    if (!comparisonTemplateElement) {
      console.error('comparison-template not found');
      return;
    }

    // Render template
    const template = Handlebars.compile(comparisonTemplateElement.innerHTML);
    const html = template(comparisonData);

    // Update DOM
    comparisonResults.innerHTML = html;
    comparisonResults.classList.remove('hide');

    // Update URL for sharing
    updateEnhancedComparisonURL(
      versionASelect.value,
      versionBSelect.value,
      packageName,
      comparisonData.versionA,
      comparisonData.versionB
    );

    // Show copy link button and helper
    if (copyComparisonLinkBtn) copyComparisonLinkBtn.classList.remove('hide');
    if (comparisonHelper) comparisonHelper.classList.remove('hide');

    // Scroll to results
    setTimeout(() => {
      comparisonResults.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 100);
  } catch (error) {
    console.error('Error in package comparison:', error);

    // Show error to user
    if (error.message.includes('Could not find version data')) {
      alert(error.message);
    } else {
      showComparisonError(error);
    }
  }
};
/**
 * Populate the package dropdown with union of packages from both versions
 * @param {Object} changelogA - Changelog for base version
 * @param {Object} changelogB - Changelog for target version
 */
const populateUnionPackages = (changelogA, changelogB) => {
  if (!comparisonPackageSelect || !comparisonPackageRow) return;

  const allPackages = getUnionPackages(changelogA, changelogB);

  if (allPackages.length === 0) {
    comparisonPackageSelect.innerHTML = '<option value="">No packages found</option>';
    comparisonPackageRow.style.display = 'none';
    return;
  }

  let optionsHtml = '<option value="">Select a package (optional)</option>';
  allPackages.forEach((pkg) => {
    optionsHtml += `<option value="${pkg}">${pkg}</option>`;
  });

  comparisonPackageSelect.innerHTML = optionsHtml;
  comparisonPackageRow.style.display = 'flex';
};

/**
 * Populate pre-release versions for a selected package
 * @param {string} packageName - Selected package name
 * @param {Object} changelog - Changelog data
 * @param {string} selectId - ID of the select element to populate
 * @param {string} stableVersion - The stable version (e.g., 3.3.1)
 */
const populatePrereleaseVersions = (packageName, changelog, selectId, stableVersion) => {
  const versionSelect =
    selectId === 'version-a-prerelease-select' ? versionAPrereleaseSelect : versionBPrereleaseSelect;

  if (!versionSelect || !packageName) {
    if (versionSelect) {
      versionSelect.innerHTML = '<option value="">No versions found</option>';
      versionSelect.disabled = true;
    }
    return;
  }

  // If package is not in this changelog, show stable version so user can still compare (e.g. base pre-release vs target stable)
  if (!changelog[packageName]) {
    if (versionSelect) {
      versionSelect.innerHTML =
        '<option value="">Select pre-release version</option>' +
        `<option value="${stableVersion}">${stableVersion} (Stable)</option>`;
      versionSelect.disabled = false;
    }
    return;
  }

  // Get all versions for this package
  const allVersions = Object.keys(changelog[packageName]);

  // Filter for pre-release versions matching the stable version
  // e.g., for stable version 3.3.1, get 3.3.1-next.1, 3.3.1-next.22, etc.
  const prereleaseVersions = allVersions.filter((v) => v.startsWith(stableVersion + '-') && v !== stableVersion);

  // Sort by version (newest first based on published date)
  prereleaseVersions.sort((a, b) => {
    const dateA = changelog[packageName][a]?.published_date || 0;
    const dateB = changelog[packageName][b]?.published_date || 0;
    return dateB - dateA;
  });

  let optionsHtml = '<option value="">Select pre-release version</option>';

  // Always add the stable version as an option (for base/target when there are no pre-releases)
  const hasStableInChangelog = changelog[packageName][stableVersion];
  if (hasStableInChangelog) {
    const stableDate = changelog[packageName][stableVersion]?.published_date;
    const dateStr = stableDate ? new Date(stableDate).toLocaleDateString() : '';
    optionsHtml += `<option value="${stableVersion}">${stableVersion} (Stable) ${dateStr ? '- ' + dateStr : ''}</option>`;
    if (prereleaseVersions.length > 0) {
      optionsHtml += `<option disabled>──────────</option>`;
    }
  } else if (prereleaseVersions.length === 0) {
    // No pre-release versions: show stable so user can select base/target version for comparison
    optionsHtml += `<option value="${stableVersion}">${stableVersion} (Stable)</option>`;
  }

  // Add pre-release versions
  prereleaseVersions.forEach((version) => {
    const date = changelog[packageName][version]?.published_date;
    const dateStr = date ? new Date(date).toLocaleDateString() : '';
    optionsHtml += `<option value="${version}">${version} ${dateStr ? '- ' + dateStr : ''}</option>`;
  });

  versionSelect.innerHTML = optionsHtml;
  versionSelect.disabled = false;
};

/* ============================================
   MAIN DATA LAYER FUNCTION
   ============================================ */

/**
 * Update URL with enhanced comparison parameters
 */
const updateEnhancedComparisonURL = (stableA, stableB, packageName, versionA, versionB) => {
  const url = new URL(window.location);

  // Clear old parameters
  url.searchParams.delete('stable_version');
  url.searchParams.delete('package');
  url.searchParams.delete('version');
  url.searchParams.delete('commitMessage');
  url.searchParams.delete('commitHash');
  url.searchParams.delete('compare');

  // Set new comparison parameters
  url.searchParams.set('compareStableA', stableA);
  url.searchParams.set('compareStableB', stableB);
  url.searchParams.set('comparePackage', packageName);
  url.searchParams.set('compareVersionA', versionA);
  url.searchParams.set('compareVersionB', versionB);

  window.history.pushState({}, '', url);
};

/**
 * Handle URL parameters for enhanced comparison
 */
const handleEnhancedComparisonURL = async () => {
  const urlParams = new URLSearchParams(window.location.search);

  const stableA = urlParams.get('compareStableA');
  const stableB = urlParams.get('compareStableB');
  const packageName = urlParams.get('comparePackage');
  const versionA = urlParams.get('compareVersionA');
  const versionB = urlParams.get('compareVersionB');

  if (stableA && stableB && packageName && versionA && versionB) {
    return {stableA, stableB, packageName, versionA, versionB, shouldCompare: true};
  }

  return {shouldCompare: false};
};

/**
 * Populate version dropdowns for comparison mode
 */
const populateComparisonVersions = () => {
  if (versionSelectDropdown && versionSelectDropdown.innerHTML) {
    const options = versionSelectDropdown.innerHTML;
    if (versionASelect) versionASelect.innerHTML = options;
    if (versionBSelect) versionBSelect.innerHTML = options;
  }
};

/**
 * Reset only pre-release selections and hide pre-release row (used when base/target change; package is kept)
 */
const resetPrereleaseOnly = () => {
  if (versionAPrereleaseSelect) versionAPrereleaseSelect.value = '';
  if (versionBPrereleaseSelect) versionBPrereleaseSelect.value = '';
  if (prereleaseRow) prereleaseRow.style.display = 'none';
};

/**
 * Reset comparison form selections (full reset e.g. on Clear; clears package and disables base/target)
 */
const resetComparisonSelections = () => {
  if (comparisonPackageSelect) comparisonPackageSelect.value = '';
  if (versionAPrereleaseSelect) versionAPrereleaseSelect.value = '';
  if (versionBPrereleaseSelect) versionBPrereleaseSelect.value = '';
  if (prereleaseRow) prereleaseRow.style.display = 'none';
  setBaseTargetVersionDisabled(true);
  setComparisonClearButtonsDisabled(true);
};

/**
 * Clear all comparison form inputs and state
 */
const clearComparisonForm = () => {
  if (versionASelect) versionASelect.value = '';
  if (versionBSelect) versionBSelect.value = '';
  resetComparisonSelections();
  if (comparisonResults) comparisonResults.classList.add('hide');

  comparisonState.reset();

  if (copyComparisonLinkBtn) copyComparisonLinkBtn.classList.add('hide');
  if (comparisonHelper) comparisonHelper.classList.add('hide');
  if (compareButton) compareButton.disabled = false;
};

/**
 * Clear comparison URL parameters
 */
const clearComparisonURLParams = () => {
  const url = new URL(window.location);
  [
    'compare',
    'versionA',
    'versionB',
    'compareStableA',
    'compareStableB',
    'comparePackage',
    'compareVersionA',
    'compareVersionB',
  ].forEach((param) => {
    url.searchParams.delete(param);
  });
  window.history.pushState({}, '', url);
};

/**
 * Check and update comparison button state (package required, then base and target)
 */
const updateCompareButtonState = () => {
  if (!compareButton) return;

  const selectedPackage = comparisonPackageSelect ? comparisonPackageSelect.value : null;
  const stableA = versionASelect ? versionASelect.value : null;
  const stableB = versionBSelect ? versionBSelect.value : null;
  const versionASpecific = versionAPrereleaseSelect ? versionAPrereleaseSelect.value : null;
  const versionBSpecific = versionBPrereleaseSelect ? versionBPrereleaseSelect.value : null;
  const prereleaseRowVisible = prereleaseRow && prereleaseRow.style.display !== 'none';

  if (!selectedPackage || !stableA || !stableB) {
    compareButton.disabled = true;
    return;
  }

  if (prereleaseRowVisible && (!versionASpecific && !versionBSpecific)) {
    compareButton.disabled = true;
    return;
  }

  compareButton.disabled = false;
};

/**
 * Update pre-release row labels with version numbers
 */
const updatePrereleaseLabels = () => {
  if (!prereleaseRow) return;

  const labelA = prereleaseRow.querySelector('label[for="version-a-prerelease-select"]');
  const labelB = prereleaseRow.querySelector('label[for="version-b-prerelease-select"]');
  if (labelA) labelA.textContent = `Pre-release Version for Base (${comparisonState.currentStableA}):`;
  if (labelB) labelB.textContent = `Pre-release Version for Target (${comparisonState.currentStableB}):`;
};

/**
 * Handle stable version changes - fetch changelogs; if package already selected, populate pre-release
 */
const handleStableVersionChange = async () => {
  console.log('🟢 handleStableVersionChange FIRED');
  const stableA = versionASelect.value;
  const stableB = versionBSelect.value;

  resetPrereleaseOnly();
  updateCompareButtonState();

  if (stableA && stableB) {
    try {
      const [changelogA, changelogB] = await Promise.all([
        fetch(versionPaths[stableA]).then((res) => res.json()),
        fetch(versionPaths[stableB]).then((res) => res.json()),
      ]);

      comparisonState.update(changelogA, changelogB, stableA, stableB);
      const selectedPackage = comparisonPackageSelect ? comparisonPackageSelect.value : '';
      if (selectedPackage) {
        populatePrereleaseVersions(
          selectedPackage,
          changelogA,
          'version-a-prerelease-select',
          stableA
        );
        populatePrereleaseVersions(
          selectedPackage,
          changelogB,
          'version-b-prerelease-select',
          stableB
        );
        if (prereleaseRow) {
          prereleaseRow.style.display = 'flex';
          updatePrereleaseLabels();
        }
      }
      // After base and target are selected, disable dropdowns but keep clear (X) buttons enabled so user can clear and pick different versions
      setBaseTargetVersionDisabled(true);
      setComparisonClearButtonsDisabled(false);
      updateCompareButtonState();
    } catch (error) {
      console.error('Error loading changelogs:', error);
      alert('Error loading version data. Please try again.');
    }
  } else {
    // Base or target cleared: re-enable base/target dropdowns and clear buttons
    setBaseTargetVersionDisabled(false);
    setComparisonClearButtonsDisabled(false);
  }
};

/**
 * Clear one stable version and re-enable dropdowns so user can change base or target (used by X buttons)
 */
const handleClearBaseVersion = () => {
  if (versionASelect) versionASelect.value = '';
  setBaseTargetVersionDisabled(false);
  setComparisonClearButtonsDisabled(false);
  resetPrereleaseOnly();
  updateCompareButtonState();
};

const handleClearTargetVersion = () => {
  if (versionBSelect) versionBSelect.value = '';
  setBaseTargetVersionDisabled(false);
  setComparisonClearButtonsDisabled(false);
  resetPrereleaseOnly();
  updateCompareButtonState();
};

/**
 * Handle package selection - enable/disable base and target; populate pre-release when base/target already set
 */
const handlePackageChange = () => {
  console.log('🟢 handlePackageChange FIRED');
  const selectedPackage = comparisonPackageSelect.value;

  if (selectedPackage) {
    setBaseTargetVersionDisabled(false);
    setComparisonClearButtonsDisabled(false);
  } else {
    setBaseTargetVersionDisabled(true);
    setComparisonClearButtonsDisabled(true);
    if (versionASelect) versionASelect.value = '';
    if (versionBSelect) versionBSelect.value = '';
    if (comparisonState) comparisonState.reset();
    if (prereleaseRow) prereleaseRow.style.display = 'none';
  }

  if (versionAPrereleaseSelect) versionAPrereleaseSelect.value = '';
  if (versionBPrereleaseSelect) versionBPrereleaseSelect.value = '';

  if (selectedPackage && comparisonState.cachedChangelogA && comparisonState.cachedChangelogB) {
    populatePrereleaseVersions(
      selectedPackage,
      comparisonState.cachedChangelogA,
      'version-a-prerelease-select',
      comparisonState.currentStableA
    );
    populatePrereleaseVersions(
      selectedPackage,
      comparisonState.cachedChangelogB,
      'version-b-prerelease-select',
      comparisonState.currentStableB
    );

    if (prereleaseRow) {
      prereleaseRow.style.display = 'flex';
      updatePrereleaseLabels();
    }
  } else {
    if (prereleaseRow) prereleaseRow.style.display = 'none';
  }

  updateCompareButtonState();
};

/**
 * Switch to single view mode
 */
const switchToSingleViewMode = () => {
  console.log('🔵 Switching to SINGLE VIEW mode');
  comparisonMode = false;

  // Update button styles
  singleViewBtn.classList.add('active', 'btn-primary');
  singleViewBtn.classList.remove('btn-default');
  comparisonViewBtn.classList.remove('active', 'btn-primary');
  comparisonViewBtn.classList.add('btn-default');

  // Toggle visibility (centralized view state)
  updateUIVisibility('search');

  if (changelogFormContainer) changelogFormContainer.classList.remove('comparison-form-full-width');
  clearComparisonURLParams();
};

/**
 * Switch to comparison view mode (package-first flow: package required, then base/target)
 */
const switchToComparisonViewMode = async () => {
  console.log('🔵 Switching to COMPARISON VIEW mode');
  comparisonMode = true;

  // Update button styles
  comparisonViewBtn.classList.add('active', 'btn-primary');
  comparisonViewBtn.classList.remove('btn-default');
  singleViewBtn.classList.remove('active', 'btn-primary');
  singleViewBtn.classList.add('btn-default');

  // Toggle visibility (centralized view state)
  updateUIVisibility('comparison');

  if (changelogFormContainer) changelogFormContainer.classList.add('comparison-form-full-width');

  populateComparisonVersions();
  await populateComparisonPackagesInitial();
  if (prereleaseRow) prereleaseRow.style.display = 'none';
  updateCompareButtonState();
};

/**
 * Validate comparison form inputs (package required first, then base and target)
 */
const validateComparisonInputs = (stableA, stableB, selectedPackage, versionASpecific, versionBSpecific) => {
  if (!selectedPackage) {
    alert('Please select a package first.');
    return false;
  }

  if (!stableA || !stableB) {
    alert('Please select both Base Version and Target Version.');
    return false;
  }

  if (selectedPackage && !versionASpecific && !versionBSpecific) {
    alert('Please select at least one pre-release version for package-level comparison.');
    return false;
  }

  return true;
};

/**
 * Handle comparison form submission
 */
const handleComparisonSubmit = (event) => {
  event.preventDefault();

  const stableA = versionASelect.value;
  const stableB = versionBSelect.value;
  const selectedPackage = comparisonPackageSelect?.value;
  const versionASpecific = versionAPrereleaseSelect?.value;
  const versionBSpecific = versionBPrereleaseSelect?.value;

  if (!validateComparisonInputs(stableA, stableB, selectedPackage, versionASpecific, versionBSpecific)) {
    return;
  }

  if (selectedPackage && (versionASpecific || versionBSpecific)) {
    // Package-level comparison
    const finalVersionA = versionASpecific || stableA;
    const finalVersionB = versionBSpecific || stableB;
    console.log('Comparing:', finalVersionA, 'vs', finalVersionB);

    compareAndRenderPackageVersions(
      selectedPackage,
      finalVersionA,
      finalVersionB,
      comparisonState.cachedChangelogA,
      comparisonState.cachedChangelogB
    );
  } else {
    // Full version comparison
    performVersionComparison(stableA, stableB);
  }

  if (compareButton) compareButton.disabled = false;
};

/**
 * Handle clear button click
 */
const handleClearClick = () => {
  clearComparisonForm();
  clearComparisonURLParams();
};

/**
 * Setup event listeners for comparison mode
 */
const setupComparisonEventListeners = () => {
  if (comparisonListenersInitialized) {
    console.log('🔴 Comparison listeners already initialized,skipping......');
    return;
  }
  console.log('🟢 Setting up comparison event listeners first time......');
  comparisonListenersInitialized = true;
  // Mode toggle buttons
  if (singleViewBtn) singleViewBtn.addEventListener('click', switchToSingleViewMode);

  if (comparisonViewBtn) comparisonViewBtn.addEventListener('click', switchToComparisonViewMode);

  // Version and package selectors
  if (versionASelect) versionASelect.addEventListener('change', handleStableVersionChange);
  if (versionBSelect) versionBSelect.addEventListener('change', handleStableVersionChange);

  if (clearBaseVersionBtn) clearBaseVersionBtn.addEventListener('click', handleClearBaseVersion);
  if (clearTargetVersionBtn) clearTargetVersionBtn.addEventListener('click', handleClearTargetVersion);

  if (comparisonPackageSelect) comparisonPackageSelect.addEventListener('change', handlePackageChange);

  // Pre-release version selectors
  if (versionAPrereleaseSelect) versionAPrereleaseSelect.addEventListener('change', updateCompareButtonState);

  if (versionBPrereleaseSelect) versionBPrereleaseSelect.addEventListener('change', updateCompareButtonState);

  // Form actions
  if (comparisonForm) comparisonForm.addEventListener('submit', handleComparisonSubmit);
  if (clearComparisonButton) clearComparisonButton.addEventListener('click', handleClearClick);
  if (copyComparisonLinkBtn) copyComparisonLinkBtn.addEventListener('click', copyComparisonLink);

  comparisonListenersInitialized = true;
  console.log('comparison listeners are initialized sucessfully......');
};

/**
 * Handle enhanced comparison URL parameters on page load
 */
const loadEnhancedComparisonFromURL = async (enhancedParams) => {
  switchToComparisonMode();
  populateComparisonVersions();
  await populateComparisonPackagesInitial();

  await new Promise((resolve) => setTimeout(resolve, 300));

  if (enhancedParams.packageName) {
    comparisonPackageSelect.value = enhancedParams.packageName;
    setBaseTargetVersionDisabled(false);
    setComparisonClearButtonsDisabled(false);
  }
  versionASelect.value = enhancedParams.stableA;
  versionBSelect.value = enhancedParams.stableB;
  await handleStableVersionChange();

  await new Promise((resolve) => setTimeout(resolve, 300));

  handlePackageChange();

  await new Promise((resolve) => setTimeout(resolve, 300));

  versionAPrereleaseSelect.value = enhancedParams.versionA;
  versionBPrereleaseSelect.value = enhancedParams.versionB;

  compareAndRenderPackageVersions(
    enhancedParams.packageName,
    enhancedParams.versionA,
    enhancedParams.versionB,
    comparisonState.cachedChangelogA,
    comparisonState.cachedChangelogB
  );
};

/**
 * Handle standard comparison URL parameters on page load
 */
const loadStandardComparisonFromURL = async (urlParams) => {
  switchToComparisonMode(urlParams.versionA, urlParams.versionB);

  await new Promise((resolve) => setTimeout(resolve, 300));

  performVersionComparison(urlParams.versionA, urlParams.versionB);
};

/**
 * Initialize comparison mode functionality (Refactored)
 */
const initializeComparisonMode = async () => {
  // Setup all event listeners
  setupComparisonEventListeners();

  // Check for URL parameters on page load
  const enhancedParams = await handleEnhancedComparisonURL();
  if (enhancedParams.shouldCompare) {
    await loadEnhancedComparisonFromURL(enhancedParams);
    return;
  }

  // Check for standard comparison URL
  const urlParams = await handleComparisonURLParams();
  if (urlParams.shouldCompare) {
    await loadStandardComparisonFromURL(urlParams);
  }
};

/**
 * Initialize application in correct order to prevent race conditions
 * This ensures versionPaths is populated before URL parameters are checked
 */
const initializeApplication = async () => {
  // Step 1: Load version paths first (critical for URL parameter handling!)
  await populateVersions();

  // Step 2: Then initialize comparison mode (which checks URL params)
  await initializeComparisonMode();
};

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  // DOM is already ready
  initializeApplication();
}