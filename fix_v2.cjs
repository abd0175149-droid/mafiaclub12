const fs = require('fs');

let dash = fs.readFileSync('src/Dashboard.tsx', 'utf8');

// ============================================================
// FIX 1: Delete button - add detailed logging to trace the issue
// Also: remove click handler from parent div entirely, add explicit "view details" button
// ============================================================

// Remove onClick from parent div wrapper (line 386)
dash = dash.replace(
  `<div className="cursor-pointer" key={activity.id} onClick={() => setSelectedActivity(activity)}>`,
  `<div key={activity.id}>`
);

// Rewrite the ActivityCard actions section completely:
// - Add "view details" button  
// - Add delete button with logging
// - Keep status select
const oldActions = `        {/* Status change + Delete [BL-04, F-01, F-02, F-10] */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
          <Select
            value={activity.status}
            onValueChange={async (v) => { try { await apiPut('/activities/' + activity.id, { status: v }); if (onStatusChange) onStatusChange(); } catch (e) { console.error(e); } }}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">مخطط له</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          {onDelete && (
            <button type="button" className="inline-flex items-center justify-center text-rose-500 h-8 w-8 rounded-md hover:bg-rose-50 transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onDelete) onDelete(); }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>`;

const newActions = `        {/* Status change + Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
          <Select
            value={activity.status}
            onValueChange={async (v) => { try { await apiPut('/activities/' + activity.id, { status: v }); if (onStatusChange) onStatusChange(); } catch (e) { console.error(e); } }}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">مخطط له</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          {onSelect && (
            <button type="button" className="inline-flex items-center justify-center text-blue-600 h-8 w-8 rounded-md hover:bg-blue-50 transition-colors" title="عرض التفاصيل" onClick={() => { console.log('[ActivityCard] View details clicked'); if (onSelect) onSelect(); }}>
              <Info className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button type="button" className="inline-flex items-center justify-center text-rose-500 h-8 w-8 rounded-md hover:bg-rose-50 transition-colors" title="حذف النشاط" onClick={() => { console.log('[ActivityCard] Delete clicked, activity:', activity.id, activity.name); if (onDelete) onDelete(); }}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>`;

dash = dash.replace(oldActions, newActions);

// Update props interface to include onSelect
dash = dash.replace(
  `  onDelete?: () => void;
  onStatusChange?: () => void;
}`,
  `  onDelete?: () => void;
  onStatusChange?: () => void;
  onSelect?: () => void;
}`
);

// Update function signature
dash = dash.replace(
  `const ActivityCard: React.FC<ActivityCardProps> = ({ activity, stats, onDelete, onStatusChange }) => {`,
  `const ActivityCard: React.FC<ActivityCardProps> = ({ activity, stats, onDelete, onStatusChange, onSelect }) => {`
);

// Update usage to pass onSelect
dash = dash.replace(
  `<ActivityCard activity={activity} stats={getActivityStats(activity.id)} onDelete={() => handleDeleteActivity(activity)} onStatusChange={fetchAll} />`,
  `<ActivityCard activity={activity} stats={getActivityStats(activity.id)} onDelete={() => handleDeleteActivity(activity)} onStatusChange={fetchAll} onSelect={() => setSelectedActivity(activity)} />`
);

// Also add logging to handleDeleteActivity
dash = dash.replace(
  `const handleDeleteActivity = async (activity: Activity) => {
    if (!window.confirm(\`هل تريد حذف "\${activity.name}"?\\nسيتم حذف جميع الحجوزات والتكاليف المرتبطة.\`)) return;
    try {
      await apiDelete(\`/activities/\${activity.id}\`);
      toast.success('تم حذف النشاط وبياناته المرتبطة');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الحذف');
    }
  };`,
  `const handleDeleteActivity = async (activity: Activity) => {
    console.log('[handleDeleteActivity] Called for:', activity.id, activity.name);
    const confirmed = window.confirm(\`هل تريد حذف "\${activity.name}"?\\nسيتم حذف جميع الحجوزات والتكاليف المرتبطة.\`);
    console.log('[handleDeleteActivity] User confirmed:', confirmed);
    if (!confirmed) return;
    try {
      console.log('[handleDeleteActivity] Sending DELETE /api/activities/' + activity.id);
      await apiDelete(\`/activities/\${activity.id}\`);
      console.log('[handleDeleteActivity] Success!');
      toast.success('تم حذف النشاط وبياناته المرتبطة');
      fetchAll();
    } catch (err: any) {
      console.error('[handleDeleteActivity] Error:', err);
      toast.error(err.message || 'حدث خطأ أثناء الحذف');
    }
  };`
);

// FIX 2: Chart warning - only render when overview AND not viewing activity details
dash = dash.replace(
  `{activeTab === 'overview' && (`,
  `{activeTab === 'overview' && !selectedActivity && (`
);

fs.writeFileSync('src/Dashboard.tsx', dash);
console.log('✅ Dashboard.tsx - complete rewrite of activity actions');

// ============================================================
// FIX 3: Drive embed - revert to embeddedfolderview (direct URL gives 403)
// ============================================================
let details = fs.readFileSync('src/views/ActivityDetails.tsx', 'utf8');

details = details.replace(
  "return 'https://drive.google.com/drive/folders/' + folderMatch[1];",
  "return 'https://drive.google.com/embeddedfolderview?id=' + folderMatch[1] + '#list';"
);

// Remove sandbox that causes issues with embeddedfolderview
details = details.replace(
  `                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation"\n`,
  ``
);
details = details.replace(
  `                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation-by-user-activation"\r\n`,
  ``
);

fs.writeFileSync('src/views/ActivityDetails.tsx', details);
console.log('✅ ActivityDetails.tsx - reverted to embeddedfolderview + removed sandbox');

console.log('\n🎉 Done!');
