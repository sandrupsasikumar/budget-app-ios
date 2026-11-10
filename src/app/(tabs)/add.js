import React from 'react';
import AddEdit from '../../screens/AddEdit';
import { useData } from '../../state';

export default function AddScreen() {
  const { data, saveTx, delTx, draft } = useData();
  // A new draft (logging a bill from Home or Plan) starts the form again with its values.
  return <AddEdit key={draft ? draft.n : 'new'} data={data} template={draft} onSave={saveTx} onUndo={delTx} />;
}
