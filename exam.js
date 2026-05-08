async function loadExams() {
  try {
    const fromIdb = await storageAdapter.primaryStore.get('klaws_exams_v1', null);
    const raw = fromIdb || localStorage.getItem('klaws_exams_v1');
    if (!raw) {
      examList = [];
      return;
    }
    examList = Array.isArray(raw) ? raw : JSON.parse(raw);
    examList.forEach(e => {
      if (e && /^tag_s_|^tag_t_/.test(e.domain || '')) e.domain = subByKey(e.domain).label;
    });
    saveExams();
  } catch (e) {
    examList = [];
  }
}

function saveExams() {
  window.KLawsStorage.governedWriteLocal('klaws_exams_v1', JSON.stringify(examList), 'rebuildable');
  storageAdapter.primaryStore.set('klaws_exams_v1', examList).catch(() => {});
}

function resetExamForm() {
  g('examQInput').value = '';
  g('examAInput').value = '';
  g('examIssInput').value = '';
  g('examTimeInput').value = '30';
  g('examSubSel').value = 'all';
  examEditingIndex = -1;
  const titleEl = g('examFormTitle');
  if (titleEl) titleEl.textContent = '新增題目';
  const saveBtn = g('examFSave');
  if (saveBtn) saveBtn.textContent = '儲存題目';
}

function openExamModePanel() { g('examModePanel')?.classList.add('open'); }
function openExamPanel() { g('examListPanel')?.classList.add('open'); renderExamList(); }
function openExamForm() { g('examListPanel')?.classList.remove('open'); g('examAddForm')?.classList.add('open'); }

function closeExamView() {
  if (examTimer) clearInterval(examTimer);
  examTimer = null;
  examSec = 0;
  examTotal = 0;
  currentExam = null;
  examAnswerReveal = false;
  g('examView')?.classList.remove('open');
  g('examResult')?.classList.remove('show');
  const answerWrap = g('examModelAnswerWrap');
  if (answerWrap) answerWrap.style.display = 'none';
  const toggleBtn = g('examToggleAnswerBtn');
  if (toggleBtn) toggleBtn.textContent = '顯示答案';
}

function renderExamList() {
  const root = g('examListItems') || g('examList');
  if (!root) return;
  if (!examList.length) {
    root.innerHTML = '<div class="item"><small style="color:var(--muted)">尚無題目，請先新增。</small></div>';
    return;
  }
  root.innerHTML = examList.map((e, i) => `
    <div class="item" data-idx="${i}">
      <div>
        <strong>${escapeHtml(e.question || '(未命名題目)')}</strong>
        <div><small>${escapeHtml(subByKey(e.domain).label || '全部')} · ${Number(e.timeLimit) || 30} 分鐘</small></div>
      </div>
      <button class="tool-btn" data-del="${i}">刪除</button>
    </div>`).join('');
  root.querySelectorAll('[data-idx]').forEach(el => el.addEventListener('click', () => {
    const i = parseInt(el.dataset.idx, 10);
    if (!Number.isFinite(i) || !examList[i]) return;
    const q = examList[i];
    g('examQInput').value = q.question || '';
    g('examAInput').value = q.answer || '';
    g('examIssInput').value = (q.issues || []).join(', ');
    g('examTimeInput').value = String(q.timeLimit || 30);
    g('examSubSel').value = q.domain || 'all';
    examEditingIndex = i;
    g('examFormTitle').textContent = '編輯題目';
    g('examFSave').textContent = '更新題目';
    g('examAddForm')?.classList.add('open');
    g('examListPanel')?.classList.remove('open');
  }));
  root.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', ev => {
    ev.stopPropagation();
    examList.splice(parseInt(btn.dataset.del, 10), 1);
    saveExams();
    renderExamList();
  }));
}

function doSubmit() { closeExamView(); showToast('作答已提交'); }
