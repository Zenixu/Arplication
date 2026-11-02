import { httpClient, isNative } from './http.js';
import { downloadMedia } from '../utils/download.js';
import { openApkInstaller } from './apkInstaller.js';

export const APP_VERSION = '1.9.11';
export const GITHUB_REPO = 'Aruthtale/Arplication';
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RAW_PACKAGE = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`;

/**
 * Compares two semantic version strings (e.g. "0.2.0" vs "0.1.0")
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareSemver(v1, v2) {
  const clean = (v) => String(v || '').replace(/^v/i, '').split('-')[0].split('.').map((n) => Number(n) || 0);
  const a = clean(v1);
  const b = clean(v2);
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const valA = a[i] || 0;
    const valB = b[i] || 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

/**
 * Checks GitHub Releases API for the latest version tag and APK asset,
 * with automatic CDN raw fallback if GitHub API rate limit is hit.
 */
export async function checkForAppUpdate() {
  try {
    const res = await httpClient({
      url: GITHUB_RELEASES_API,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Arplication-App-Updater',
      },
    });

    if (res && res.tag_name) {
      const latestTag = String(res.tag_name).trim().replace(/^v/i, '');
      const hasUpdate = compareSemver(latestTag, APP_VERSION) > 0;
      const apkAsset = Array.isArray(res.assets)
        ? res.assets.find((ast) => String(ast.name).endsWith('.apk') || String(ast.browser_download_url).endsWith('.apk'))
        : null;
      const downloadUrl = apkAsset?.browser_download_url || res.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;

      return {
        hasUpdate,
        currentVersion: APP_VERSION,
        latestVersion: latestTag,
        releaseName: res.name || `Versi ${latestTag}`,
        releaseNotes: res.body || 'Tidak ada catatan rilis.',
        publishedAt: res.published_at,
        downloadUrl,
        apkAsset: apkAsset ? { name: apkAsset.name, size: apkAsset.size } : null,
      };
    }
  } catch (err) {
    console.warn('GitHub Releases API check failed (attempting raw fallback):', err?.message || err);
  }

  // Fallback to GitHub Raw package.json (no API rate limit)
  try {
    const pkgRes = await httpClient({
      url: GITHUB_RAW_PACKAGE,
    });
    if (pkgRes && pkgRes.version) {
      const latestTag = String(pkgRes.version).trim().replace(/^v/i, '');
      const hasUpdate = compareSemver(latestTag, APP_VERSION) > 0;
      const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download/Arplication-v${latestTag}.apk`;

      return {
        hasUpdate,
        currentVersion: APP_VERSION,
        latestVersion: latestTag,
        releaseName: `Rilis Versi ${latestTag}`,
        releaseNotes: 'Catatan rilis dapat dilihat di halaman GitHub Releases.',
        downloadUrl,
        fallbackCDN: true,
      };
    }
  } catch (rawErr) {
    console.warn('Raw package.json check failed:', rawErr);
  }

  return {
    hasUpdate: false,
    currentVersion: APP_VERSION,
    error: 'Gagal memeriksa pembaruan. Silakan periksa koneksi internet.',
  };
}

/**
 * Downloads the APK and opens package installer / download location
 */
export async function startApkUpdateDownload({ downloadUrl, version, onProgress }) {
  if (!downloadUrl) throw new Error('URL download tidak valid.');

  const filename = `Arplication-v${version || 'latest'}.apk`;

  if (isNative()) {
    try {
      const res = await downloadMedia({
        url: downloadUrl,
        filename,
        platform: 'Arplication',
        onProgress: (pct, msg) => {
          if (onProgress) onProgress(pct, msg);
        },
      });
      // Auto-open the Android package installer so the user can tap
      // "Install" directly — no need to hunt the APK in File Manager.
      let installer = { available: false };
      if (onProgress) onProgress(96, 'Membuka layar Install...');
      try {
        installer = await openApkInstaller(res.path);
      } catch (installErr) {
        console.warn('Auto-open installer failed:', installErr?.message || installErr);
      }
      return {
        success: true,
        native: true,
        location: res.location,
        path: res.path,
        installerOpened: installer.available && (installer.opened || installer.openedSettings),
        installerNeedsPermission: installer.available && !!installer.openedSettings,
      };
    } catch (e) {
      console.warn('Native APK download failed, opening browser:', e);
      window.open(downloadUrl, '_system');
      return { success: true, direct: true };
    }
  } else {
    // Web Browser
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 1000);
    return { success: true, web: true };
  }
}
