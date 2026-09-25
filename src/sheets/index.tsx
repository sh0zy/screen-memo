import { useUI, type Sheet as SheetSpec } from '../store/ui';
import { TaskSheet } from './TaskSheet';
import { NoteSheet } from './NoteSheet';
import { ScheduleSheet, HabitSheet, CountdownSheet, GoalsSheet, CardSheet, SaveTemplateSheet, CategoriesSheet } from './SmallSheets';
import { DesignSheet } from './DesignSheet';
import { SectionsSheet } from './SectionsSheet';
import { ScreensSheet } from './ScreensSheet';
import { InboxSheet, TrashSheet, ArchiveSheet, SearchSheet, HistorySheet } from './ListSheets';
import { AddSheet, QuickSheet, TaskActionsSheet, NoteActionsSheet } from './ActionSheets';

export function SheetHost() {
  const sheets = useUI((s) => s.sheets);
  const closeSheet = useUI((s) => s.closeSheet);

  return (
    <>
      {sheets.map((spec, i) => (
        <Render key={`${spec.type}-${i}`} spec={spec} depth={i} onClose={closeSheet} />
      ))}
    </>
  );
}

function Render({ spec, depth, onClose }: { spec: SheetSpec; depth: number; onClose: () => void }) {
  const p = { depth, onClose };
  switch (spec.type) {
    case 'add':
      return <AddSheet {...p} />;
    case 'quick':
      return <QuickSheet {...p} target={spec.target} />;
    case 'task':
      return <TaskSheet {...p} id={spec.id} defaults={spec.defaults} />;
    case 'taskActions':
      return <TaskActionsSheet {...p} id={spec.id} />;
    case 'note':
      return <NoteSheet {...p} id={spec.id} kind={spec.kind} />;
    case 'noteActions':
      return <NoteActionsSheet {...p} id={spec.id} />;
    case 'schedule':
      return <ScheduleSheet {...p} id={spec.id} date={spec.date} />;
    case 'habit':
      return <HabitSheet {...p} id={spec.id} />;
    case 'countdown':
      return <CountdownSheet {...p} id={spec.id} />;
    case 'goals':
      return <GoalsSheet {...p} />;
    case 'cards':
      return <CardSheet {...p} id={spec.id} />;
    case 'design':
      return <DesignSheet {...p} />;
    case 'sections':
      return <SectionsSheet {...p} />;
    case 'screens':
      return <ScreensSheet {...p} />;
    case 'saveTemplate':
      return <SaveTemplateSheet {...p} />;
    case 'categories':
      return <CategoriesSheet {...p} />;
    case 'inbox':
      return <InboxSheet {...p} />;
    case 'trash':
      return <TrashSheet {...p} />;
    case 'archive':
      return <ArchiveSheet {...p} />;
    case 'search':
      return <SearchSheet {...p} />;
    case 'history':
      return <HistorySheet {...p} />;
  }
}

export type { SheetProps } from './types';
