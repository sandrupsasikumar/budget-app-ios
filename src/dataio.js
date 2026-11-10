import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { isWeb, say } from './platform';
import { transactionsToCsv, csvToTransactions, newId, migrate, todayString } from './logic';

// Web: share sheet with a file where supported (iPhone: Save to Files, AirDrop, Mail),
// otherwise a normal download. Native: write to cache then open the share sheet.
async function shareOrDownload(filename, text, mimeType) {
  if (isWeb) {
    const blob = new Blob([text], { type: mimeType });
    try {
      const file = new window.File([blob], filename, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return true;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false; // person closed the share sheet
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  }
  if (!(await Sharing.isAvailableAsync())) {
    say('Sharing is not available', 'This device cannot open the share sheet.');
    return false;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
  return true;
}

export async function exportCsv(data) {
  try {
    await shareOrDownload(`budget-transactions-${todayString()}.csv`, transactionsToCsv(data.transactions), 'text/csv');
  } catch (e) {
    say('Export failed', String(e.message || e));
  }
}

// Returns true when the backup was handed to the share sheet or downloaded.
export async function exportBackup(data) {
  try {
    const { lastBackup, ...rest } = data.settings;
    const copy = { ...data, settings: rest };
    return await shareOrDownload(`budget-backup-${todayString()}.json`, JSON.stringify(copy, null, 1), 'application/json');
  } catch (e) {
    say('Backup failed', String(e.message || e));
    return false;
  }
}

async function readPicked(asset) {
  if (isWeb) {
    if (asset.file && asset.file.text) return asset.file.text();
    const res = await fetch(asset.uri);
    return res.text();
  }
  return new File(asset.uri).text();
}

// Restores a JSON backup or merges a CSV. Calls replaceAll or update on the app data.
export async function importFile(data, { update, replaceAll }) {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const text = await readPicked(asset);
    if ((asset.name || '').toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets)) throw new Error('Not a backup from this app');
      replaceAll(migrate(parsed));
      say('Backup restored', `${parsed.transactions.length} transactions loaded. Receipt photos are not included in backups.`);
    } else {
      const cats = [...data.budgets.map((b) => b.category), 'Income'];
      const { transactions, skipped } = csvToTransactions(text, cats);
      const key = (t) => `${t.date}|${t.category}|${t.amount}|${t.description}|${t.store || ''}`;
      const have = new Set(data.transactions.map(key));
      const fresh = transactions.filter((t) => !have.has(key(t)));
      update((d) => ({ ...d, transactions: [...d.transactions, ...fresh.map((t) => ({ ...t, id: newId(), split: null, receipt: null }))] }));
      say('Import finished', `${fresh.length} added, ${transactions.length - fresh.length} duplicates ignored, ${skipped} rows skipped.`);
    }
  } catch (e) {
    say('Import failed', String(e.message || e));
  }
}
