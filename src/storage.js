import AsyncStorage from '@react-native-async-storage/async-storage';
import seed from '../data/seed.json';
import { migrate } from './logic';

const KEY = 'budget-data-v1';

export function freshData() {
  return migrate(seed);
}

export async function loadData() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && Array.isArray(parsed.budgets)) return migrate(parsed);
    }
  } catch {
    // fall through to the seed data
  }
  return freshData();
}

export async function saveData(data) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage can fail on a full disk; the in-memory copy stays usable.
  }
}
