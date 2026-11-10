import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Image, Modal } from 'react-native';
import { Card, Btn, Chip, ChipRow, Field, Label, Screen, T, Row, Icon, Toggle } from '../ui';
import { useTheme } from '../theme';
import {
  INCOME, isValidDate, newId, shiftDate, todayString, money, storeIndex, storeSuggestions,
  recentTemplates, splitShare, txTitle,
} from '../logic';
import { pickReceipt, deleteReceipt, useReceiptUri } from '../receipts';
import { say, confirmAction } from '../platform';
import DateField from '../DateField';


const METHOD_ICONS = { 'Credit Card': 'card-outline', 'Debit Card': 'card-outline', Cash: 'cash-outline', 'Bank Transfer': 'swap-horizontal-outline', Other: 'ellipsis-horizontal' };

export function ReceiptViewer({ uri: ref, onClose }) {
  const uri = useReceiptUri(ref);
  return (
    <Modal visible={!!ref} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '85%' }} resizeMode="contain" accessibilityLabel="Receipt photo" /> : null}
        <Text style={{ color: '#fff', marginTop: 12 }}>Tap anywhere to close</Text>
      </Pressable>
    </Modal>
  );
}

function Thumb({ refId }) {
  const c = useTheme();
  const uri = useReceiptUri(refId);
  return uri
    ? <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: c.track, borderWidth: 1, borderColor: c.line }} accessibilityLabel="Receipt thumbnail" />
    : <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: c.track }} />;
}

export default function AddEdit({ data, existing, onSave, onDelete, onDone }) {
  const c = useTheme();
  const cats = [...data.budgets.map((b) => b.category), INCOME];
  const [date, setDate] = useState(existing?.date || todayString());
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [splitOn, setSplitOn] = useState(!!existing?.split);
  const [splitTotal, setSplitTotal] = useState(existing?.split ? String(existing.split.total) : '');
  const [splitPeople, setSplitPeople] = useState(existing?.split ? String(existing.split.people) : '2');
  const [category, setCategory] = useState(existing?.category || '');
  const [store, setStore] = useState(existing?.store || '');
  const [storeFocus, setStoreFocus] = useState(false);
  const [description, setDescription] = useState(existing?.description || '');
  const [method, setMethod] = useState(existing?.method || data.methods[0]);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [receipt, setReceipt] = useState(existing?.receipt || null);
  const [viewing, setViewing] = useState(null);
  const [banner, setBanner] = useState(null);
  // A new id for every expense added, so saving twice in a row does not overwrite the first one.
  const [draftId, setDraftId] = useState(existing?.id || newId());

  const index = useMemo(() => storeIndex(data.transactions), [data.transactions]);
  const suggestions = storeFocus ? storeSuggestions(index, store) : [];
  const recents = useMemo(() => (existing ? [] : recentTemplates(data.transactions)), [data.transactions, existing]);

  const total = parseFloat(String(splitTotal).replace(/[$,]/g, ''));
  const people = parseInt(splitPeople, 10);
  const amt = splitOn ? (Number.isNaN(total) ? NaN : splitShare(total, people > 0 ? people : 1)) : parseFloat(amount.replace(/[$,]/g, ''));

  const problem = Number.isNaN(amt) || amt <= 0 ? 'Enter an amount above 0'
    : !category ? 'Pick a category'
    : !isValidDate(date) ? 'Date must look like 2026-10-13' : null;

  const pickStore = (s) => {
    setStore(s.store);
    setCategory(s.category);
    if (s.method) setMethod(s.method);
    setStoreFocus(false);
  };

  const applyTemplate = (t) => {
    setStore(t.store || '');
    setDescription(t.description || '');
    setCategory(t.category);
    if (t.method) setMethod(t.method);
    if (t.split) {
      setSplitOn(true);
      setSplitTotal(String(t.split.total));
      setSplitPeople(String(t.split.people));
    } else {
      setSplitOn(false);
    }
    setAmount(String(t.amount));
    setDate(todayString());
    setBanner(null);
  };

  const reset = () => {
    setAmount(''); setDescription(''); setNotes(''); setCategory(''); setStore('');
    setReceipt(null); setSplitOn(false); setSplitTotal(''); setSplitPeople('2');
    setDraftId(newId());
  };

  const save = () => {
    if (problem) return;
    const tx = {
      id: existing?.id || draftId, date, store: store.trim(), description: description.trim(), category,
      amount: Math.round(amt * 100) / 100, method, notes: notes.trim(), receipt,
      split: splitOn ? { total: Math.round(total * 100) / 100, people: people > 0 ? people : 1 } : null,
    };
    if (existing?.receipt && existing.receipt !== receipt) deleteReceipt(existing.receipt);
    const alert = onSave(tx);
    if (existing) { onDone && onDone(); return; }
    setBanner({ text: `Saved ${money(tx.amount)} to ${tx.category}`, alert });
    reset();
  };

  const attach = async (source) => {
    try {
      const uri = await pickReceipt(source, draftId);
      if (uri) {
        if (receipt && receipt !== existing?.receipt) deleteReceipt(receipt);
        setReceipt(uri);
      }
    } catch (e) {
      say('Could not add photo', String(e.message || e));
    }
  };

  const confirmDelete = () => {
    const go = () => { deleteReceipt(existing.receipt); onDelete(existing.id); onDone && onDone(); };
    confirmAction('Delete this transaction?', `${txTitle(existing)}, ${money(existing.amount)}`, 'Delete', go);
  };

  return (
    <Screen>
      {banner && (
        <Card style={{ backgroundColor: banner.alert ? (banner.alert.level === 'over' ? c.bad + '22' : c.warn + '22') : c.accentSoft, borderColor: 'transparent' }}>
          <Row style={{ gap: 8 }}>
            <Icon name={banner.alert ? 'alert-circle' : 'checkmark-circle'} size={20} color={banner.alert ? (banner.alert.level === 'over' ? c.bad : c.warn) : c.accent} />
            <View style={{ flex: 1 }}>
              <T weight="700">{banner.text}</T>
              {banner.alert && <T size={13}>{banner.alert.title}. {banner.alert.body}</T>}
            </View>
          </Row>
        </Card>
      )}

      {recents.length > 0 && (
        <View>
          <Label>Quick add again</Label>
          <ChipRow>
            {recents.map((t) => (
              <Pressable key={t.id} onPress={() => applyTemplate(t)} accessibilityRole="button"
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, minWidth: 110 }}>
                <T size={14} weight="700" numberOfLines={1}>{txTitle(t)}</T>
                <T size={12} muted>{money(t.amount)}  {t.category}</T>
              </Pressable>
            ))}
          </ChipRow>
        </View>
      )}

      <Card style={{ gap: 14 }}>
        {!splitOn ? (
          <Field label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00"
            inputStyle={{ fontSize: 26, fontWeight: '800' }} />
        ) : (
          <View>
            <Row style={{ gap: 8, alignItems: 'flex-end' }}>
              <Field style={{ flex: 1.4 }} label="Total bill ($)" value={splitTotal} onChangeText={setSplitTotal} keyboardType="decimal-pad" placeholder="0.00" />
              <Field style={{ flex: 1 }} label="People sharing" value={splitPeople} onChangeText={setSplitPeople} keyboardType="number-pad" />
            </Row>
            <T size={14} style={{ marginTop: 8 }}>Your share: <T weight="800" color={c.accent}>{Number.isNaN(amt) ? '$0.00' : money(amt)}</T></T>
          </View>
        )}
        <Toggle label="Split with others" sub="Enter the full bill and save only your share" value={splitOn}
          onChange={(v) => { setSplitOn(v); if (v && amount) setSplitTotal(amount); }} />

        <View style={{ zIndex: 2 }}>
          <Field label="Store" value={store} onChangeText={(v) => { setStore(v); setStoreFocus(true); }} placeholder="e.g. Coles"
            onFocus={() => setStoreFocus(true)} onBlur={() => setTimeout(() => setStoreFocus(false), 150)} autoCapitalize="words" />
          {suggestions.length > 0 && (
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, marginTop: 4, backgroundColor: c.raised }}>
              {suggestions.map((s) => (
                <Pressable key={s.store} onPress={() => pickStore(s)} style={{ paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="storefront-outline" size={16} color={c.muted} />
                  <T style={{ flex: 1 }}>{s.store}</T>
                  <T size={12} muted>{s.category}</T>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View>
          <Label>Category</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((x) => <Chip key={x} label={x} active={category === x} onPress={() => setCategory(x)} />)}
          </View>
        </View>

        <View>
          <Label>Paid with</Label>
          <ChipRow>
            {data.methods.map((m) => <Chip key={m} label={m} icon={METHOD_ICONS[m]} active={method === m} onPress={() => setMethod(m)} />)}
          </ChipRow>
        </View>

        <Field label="What did you buy?" value={description} onChangeText={setDescription} placeholder="e.g. Weekly groceries" />

        <View>
          <Label>Date</Label>
          <Row style={{ gap: 8 }}>
            <Btn icon="chevron-back" kind="soft" onPress={() => isValidDate(date) && setDate(shiftDate(date, -1))} style={{ paddingHorizontal: 12 }} />
            <DateField style={{ flex: 1 }} value={date} onChange={setDate} accessibilityLabel="Date" />
            <Btn icon="chevron-forward" kind="soft" onPress={() => isValidDate(date) && setDate(shiftDate(date, 1))} style={{ paddingHorizontal: 12 }} />
            <Btn title="Today" kind="soft" onPress={() => setDate(todayString())} />
          </Row>
        </View>

        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />

        <View>
          <Label>Receipt</Label>
          {receipt ? (
            <Row style={{ gap: 12 }}>
              <Pressable onPress={() => setViewing(receipt)} accessibilityLabel="View receipt">
                <Thumb refId={receipt} />
              </Pressable>
              <Btn title="Replace" kind="soft" icon="camera-outline" onPress={() => attach('camera')} />
              <Btn title="Remove" kind="ghost" onPress={() => { if (receipt !== existing?.receipt) deleteReceipt(receipt); setReceipt(null); }} />
            </Row>
          ) : (
            <Row style={{ gap: 8 }}>
              <Btn style={{ flex: 1 }} title="Take photo" kind="soft" icon="camera-outline" onPress={() => attach('camera')} />
              <Btn style={{ flex: 1 }} title="From gallery" kind="soft" icon="image-outline" onPress={() => attach('library')} />
            </Row>
          )}
        </View>

        {problem && (amount !== '' || splitTotal !== '' || category !== '') ? <T size={13} color={c.bad}>{problem}</T> : null}
        <Btn title={existing ? 'Save changes' : `Add ${Number.isNaN(amt) || !amt ? 'expense' : money(amt)}`} onPress={save} disabled={!!problem} />
        {existing && <Btn title="Delete" kind="danger" icon="trash-outline" onPress={confirmDelete} />}
        {existing && <Btn title="Cancel" kind="ghost" onPress={onDone} />}
      </Card>
      <ReceiptViewer uri={viewing} onClose={() => setViewing(null)} />
    </Screen>
  );
}
