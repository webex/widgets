// Global variable to store the current changelog and version paths
let currentChangelog;
const versionPaths = {};
let comparisonListenersInitialized = false;
const githubBaseUrl = 'https://github.com/webex/widgets/';
import {
  comparisonState,
  generatePackageComparisonData,
  sortStableVersions,
  collectCommitsFromStable,
} from './comparison-view.js';

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
const copyComparisonLinkBtn = document.getElementById('copy-comparison-link');
const comparisonHelper = document.getElementById('comparison-helper');

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



Handlebars.registerHelper('math', function (index, offset) {
  return index + offset;//
});

// Util Methods
const populateFormFieldsFromURL = async () => {
  const queryParams = new URLSearchParams(window.location.search);

  // Skip single-view URL handling if comparison parameters are present
  if (
    queryParams.has('compare') ||
    queryParams.has('compareStableA'))
   {
    return;
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

const populatePackageNames = (changelog) => {
  let specialPackages = ['@webex/widgets', '@webex/cc-widgets'];

  // Get all packages that actually exist in this version's changelog
  let allPackages = Object.keys(changelog);

  // Filter special packages that ACTUALLY EXIST in this version
  let existingSpecialPackages = specialPackages.filter((pkg) => allPackages.includes(pkg));

  // Get remaining packages (excluding special ones)
  let otherPackages = allPackages.filter((pkg) => !specialPackages.includes(pkg));

  // Sort the remaining packages alphabetically
  otherPackages.sort();

  // Build the sorted list - only add separator if special packages exist
  let sortedPackages;
  if (existingSpecialPackages.length > 0) {
    sortedPackages = ['separator', ...existingSpecialPackages, 'separator', ...otherPackages];
  } else {
    // No special packages exist, just show others
    sortedPackages = otherPackages;
  }

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
  // Hide package-level comparison section in version comparison mode
  if (packageLevelSection) packageLevelSection.classList.add('hide');

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
 * UI LAYER: Compare specific package versions and render results
 * @param {string} packageName - Package name
 * @param {string} versionASpecific - Version A
 * @param {string} versionBSpecific - Version B
 * @param {Object} changelogA - Changelog A
 * @param {Object} changelogB - Changelog B
 */
const compareAndRenderPackageVersions = (packageName, versionASpecific, versionBSpecific, changelogA, changelogB, totalCommits = 0) => {
  try {
    const comparisonData = generatePackageComparisonData(
      packageName,
      versionASpecific,
      versionBSpecific,
      changelogA,
      changelogB
    );

    comparisonData.totalCommits = totalCommits;

    if (!comparisonResults) {
      console.error('comparison-results element not found');
      return;
    }

    if (!comparisonTemplateElement) {
      console.error('comparison-template not found');
      return;
    }

    const template = Handlebars.compile(comparisonTemplateElement.innerHTML);
    const html = template(comparisonData);

    // Update DOM
    comparisonResults.innerHTML += html;
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

  let optionsHtml = '<option value="">Select a package</option>';
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

  // Check if package exists in this changelog (it might not for union packages)
  if (!changelog[packageName]) {
    if (versionSelect) {
      versionSelect.innerHTML = '<option value="">Package not available in this version</option>';
      versionSelect.disabled = true;
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

  // Also add the stable version itself as an option
  if (changelog[packageName][stableVersion]) {
    const stableDate = changelog[packageName][stableVersion]?.published_date;
    const dateStr = stableDate ? new Date(stableDate).toLocaleDateString() : '';
    optionsHtml += `<option value="${stableVersion}">${stableVersion} (Stable) ${dateStr ? '- ' + dateStr : ''}</option>`;

    if (prereleaseVersions.length > 0) {
      optionsHtml += `<option disabled>──────────</option>`;
    }
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
 * Reset comparison form selections
 */
const resetComparisonSelections = () => {
  if (comparisonPackageSelect) comparisonPackageSelect.value = '';
  if (versionAPrereleaseSelect) versionAPrereleaseSelect.value = '';
  if (versionBPrereleaseSelect) versionBPrereleaseSelect.value = '';
  if (comparisonPackageRow) comparisonPackageRow.style.display = 'none';
  if (prereleaseRow) prereleaseRow.style.display = 'none';
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
 * Check and update comparison button state based on form selections
 */
const updateCompareButtonState = () => {
  if (!compareButton) return;

  const selectedPackage = comparisonPackageSelect ? comparisonPackageSelect.value : null;
  const versionASpecific = versionAPrereleaseSelect ? versionAPrereleaseSelect.value : null;
  const versionBSpecific = versionBPrereleaseSelect ? versionBPrereleaseSelect.value : null;
  const prereleaseRowVisible = prereleaseRow && prereleaseRow.style.display !== 'none';

  if (selectedPackage) {
    // Package selected - require at least one pre-release version
    if (!prereleaseRowVisible || (!versionASpecific && !versionBSpecific)) {
      compareButton.disabled = true;
    } else {
      compareButton.disabled = false;
    }
  } else {
    compareButton.disabled = true;
  }
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
 * Handle stable version changes - fetch changelogs and populate packages
 */
const handleStableVersionChange = async () => {
  console.log('🟢 handleStableVersionChange FIRED');
  const stableA = versionASelect.value;
  const stableB = versionBSelect.value;

  resetComparisonSelections();
  updateCompareButtonState();

  if (stableA && stableB) {
    try {
      const [changelogA, changelogB] = await Promise.all([
        fetch(versionPaths[stableA]).then((res) => res.json()),
        fetch(versionPaths[stableB]).then((res) => res.json()),
      ]);

      comparisonState.update(changelogA, changelogB, stableA, stableB);
      populateUnionPackages(changelogA, changelogB);
      updateCompareButtonState();
    } catch (error) {
      console.error('Error loading changelogs:', error);
      alert('Error loading version data. Please try again.');
    }
  }
};

/**
 * Handle package selection - populate pre-release versions
 */
const handlePackageChange = () => {
  console.log('🟢 handlePackageChange FIRED');
  const selectedPackage = comparisonPackageSelect.value;

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

  clearComparisonURLParams();
};

/**
 * Switch to comparison view mode
 */
const switchToComparisonViewMode = () => {
  console.log('🔵 Switching to COMPARISON VIEW mode');
  comparisonMode = true;

  // Update button styles
  comparisonViewBtn.classList.add('active', 'btn-primary');
  comparisonViewBtn.classList.remove('btn-default');
  singleViewBtn.classList.remove('active', 'btn-primary');
  singleViewBtn.classList.add('btn-default');

  // Toggle visibility (centralized view state)
  updateUIVisibility('comparison');

  populateComparisonVersions();
};

/**
 * Validate comparison form inputs
 */
const validateComparisonInputs = (stableA, stableB, selectedPackage, versionASpecific, versionBSpecific) => {
  if (!stableA || !stableB) {
    alert('Please select both stable versions');
    return false;
  }

  if (selectedPackage && !versionASpecific && !versionBSpecific) {
    alert('Please select at least one pre-release version, or leave package empty for full version comparison');
    return false;
  }

  // Base stable version must be older than or equal to target
  const allStables = sortStableVersions(Object.keys(versionPaths));
  const idxA = allStables.indexOf(stableA);
  const idxB = allStables.indexOf(stableB);

  if (idxA > idxB) {
    alert('Base version must be older than or equal to target version');
    return false;
  }

  // If same stable and both pre-releases selected, base must be older
  if (stableA === stableB && versionASpecific && versionBSpecific) {
    const numA = parseInt(versionASpecific.match(/\.(\d+)$/)?.[1] || '0', 10);
    const numB = parseInt(versionBSpecific.match(/\.(\d+)$/)?.[1] || '0', 10);
    if (numA > numB) {
      alert('Base pre-release version must be older than target pre-release version');
      return false;
    }
  }

  return true;
};

/* ============================================
   CROSS-STABLE COMMIT AGGREGATION (app-level)
   These functions interact with versionPaths and
   the DOM, so they live here instead of comparison-view.js
   ============================================ */

/**
 * Return the ordered list of stable versions between stableA and stableB (inclusive).
 */
const getStableVersionsBetween = (stableA, stableB) => {
  const allStables = sortStableVersions(Object.keys(versionPaths));
  const idxA = allStables.indexOf(stableA);
  const idxB = allStables.indexOf(stableB);
  if (idxA === -1 || idxB === -1) return [];
  const lo = Math.min(idxA, idxB);
  const hi = Math.max(idxA, idxB);
  return allStables.slice(lo, hi + 1);
};

/**
 * Walk every stable between stableA..stableB,
 * fetch each log file, and collect deduplicated commits.
 */
const collectCommitsAcrossStables = async (packageName, stableA, stableB, versionA, versionB) => {
  const stables = getStableVersionsBetween(stableA, stableB);
  if (stables.length === 0) return [];

  const allCommits = [];
  for (let i = 0; i < stables.length; i++) {
    const stable = stables[i];
    const path = versionPaths[stable];
    if (!path) continue;

    let changelog;
    try {
      const res = await fetch(path);
      changelog = await res.json();
    } catch {
      continue;
    }

    const packageData = changelog[packageName];
    if (!packageData) continue;

    let position;
    if (stables.length === 1) position = 'only';
    else if (i === 0) position = 'start';
    else if (i === stables.length - 1) position = 'end';
    else position = 'middle';

    const commits = collectCommitsFromStable(packageData, stable, versionA, versionB, position);
    allCommits.push(...commits);
  }

  // Final dedup by hash
  const seen = new Map();
  allCommits.forEach((c) => {
    if (!seen.has(c.hash)) seen.set(c.hash, c);
  });
  return Array.from(seen.values());
};

/**
 * Render the commit history using the Handlebars template in index.html
 */
const renderCommitHistory = (packageName, versionA, versionB, commits) => {
  const templateEl = document.getElementById('commit-history-template');
  if (!templateEl) {
    console.error('commit-history-template not found in DOM');
    return;
  }

  const template = Handlebars.compile(templateEl.innerHTML);
  const html = template({
    packageName,
    versionA,
    versionB,
    commits,
    totalCommits: commits.length,
    githubBaseUrl,
  });

  comparisonResults.innerHTML = html;
  comparisonResults.classList.remove('hide');

  if (copyComparisonLinkBtn) copyComparisonLinkBtn.classList.remove('hide');
  if (comparisonHelper) comparisonHelper.classList.remove('hide');
};

/**
 * Handle comparison form submission
 */
const handleComparisonSubmit = async (event) => {
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
    const finalVersionA = versionASpecific || stableA;
    const finalVersionB = versionBSpecific || stableB;

    try {
      const commits = await collectCommitsAcrossStables(
        selectedPackage,
        stableA,
        stableB,
        finalVersionA,
        finalVersionB
      );

      // Commit history table first
      renderCommitHistory(selectedPackage, finalVersionA, finalVersionB, commits);

      // Package-level comparison table (appended below)
      compareAndRenderPackageVersions(
        selectedPackage,
        finalVersionA,
        finalVersionB,
        comparisonState.cachedChangelogA,
        comparisonState.cachedChangelogB,
        commits.length
      );

      updateEnhancedComparisonURL(stableA, stableB, selectedPackage, finalVersionA, finalVersionB);
    } catch (error) {
      showComparisonError(error);
    }
  } else {
    alert('Please select a package and at least one pre-release version to compare.');
    return;
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

  await new Promise((resolve) => setTimeout(resolve, 300));

  versionASelect.value = enhancedParams.stableA;
  versionBSelect.value = enhancedParams.stableB;
  await handleStableVersionChange();

  await new Promise((resolve) => setTimeout(resolve, 300));

  comparisonPackageSelect.value = enhancedParams.packageName;
  handlePackageChange();

  await new Promise((resolve) => setTimeout(resolve, 300));

  versionAPrereleaseSelect.value = enhancedParams.versionA;
  versionBPrereleaseSelect.value = enhancedParams.versionB;

  try {
    const commits = await collectCommitsAcrossStables(
      enhancedParams.packageName,
      enhancedParams.stableA,
      enhancedParams.stableB,
      enhancedParams.versionA,
      enhancedParams.versionB
    );

    renderCommitHistory(
      enhancedParams.packageName,
      enhancedParams.versionA,
      enhancedParams.versionB,
      commits
    );

    compareAndRenderPackageVersions(
      enhancedParams.packageName,
      enhancedParams.versionA,
      enhancedParams.versionB,
      comparisonState.cachedChangelogA,
      comparisonState.cachedChangelogB,
      commits.length
    );
  } catch (error) {
    console.error('Error loading commit history from URL:', error);
  }
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