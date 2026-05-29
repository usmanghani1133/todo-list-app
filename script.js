/**
 * TaskFlow — Modern To-Do App
 * script.js  |  Vanilla JavaScript
 *
 * Features:
 *  - Add, edit, delete tasks
 *  - Toggle task completion
 *  - Prevent duplicate / empty tasks
 *  - Filter: All / Active / Completed
 *  - Clear all completed tasks
 *  - localStorage persistence
 *  - Task counter & progress bar
 *  - Toast notifications
 *  - Enter-key support
 *  - Smooth animations
 */

/* ============================================================
   1. STATE & CONSTANTS
   ============================================================ */

/** Master task array — single source of truth */
let tasks = [];

/** Currently active filter: 'all' | 'active' | 'completed' */
let currentFilter = 'all';

/** ID of the task being edited (null when modal is closed) */
let editingTaskId = null;

/** localStorage key */
const STORAGE_KEY = 'taskflow_tasks_v1';

/* ============================================================
   2. DOM REFERENCES
   ============================================================ */

const taskInput        = document.getElementById('taskInput');
const addTaskBtn       = document.getElementById('addTaskBtn');
const taskList         = document.getElementById('taskList');
const emptyState       = document.getElementById('emptyState');
const errorMsg         = document.getElementById('errorMsg');

// Stats
const totalCount       = document.getElementById('totalCount');
const activeCount      = document.getElementById('activeCount');
const completedCount   = document.getElementById('completedCount');

// Filters
const filterBtns       = document.querySelectorAll('.filter-btn');
const clearCompletedBtn= document.getElementById('clearCompletedBtn');

// Progress bar
const progressFill     = document.getElementById('progressFill');
const progressPercent  = document.getElementById('progressPercent');
const progressTrack    = document.getElementById('progressTrack');

// Modal
const modalOverlay     = document.getElementById('modalOverlay');
const editInput        = document.getElementById('editInput');
const saveEditBtn      = document.getElementById('saveEditBtn');
const cancelEditBtn    = document.getElementById('cancelEditBtn');
const editErrorMsg     = document.getElementById('editErrorMsg');

// Toast
const toast            = document.getElementById('toast');

// Date display
const headerDate       = document.getElementById('headerDate');

/* ============================================================
   3. INITIALIZATION
   ============================================================ */

/**
 * Runs once on page load.
 * Loads tasks from localStorage, renders the UI, sets the date.
 */
function init() {
  loadFromStorage();
  renderTasks();
  updateStats();
  setHeaderDate();
}

/** Formats and displays today's date in the header */
function setHeaderDate() {
  const now    = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  headerDate.textContent = now.toLocaleDateString('en-US', options);
}

/* ============================================================
   4. STORAGE HELPERS
   ============================================================ */

/** Reads the task array from localStorage */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch {
    // If data is corrupted, start fresh
    tasks = [];
  }
}

/** Writes the current task array to localStorage */
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/* ============================================================
   5. TASK CRUD
   ============================================================ */

/**
 * Creates a unique ID using timestamp + random number.
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Adds a new task.
 * Validates input: must not be empty or a duplicate.
 */
function addTask() {
  const text = taskInput.value.trim();

  // --- Validation: empty input ---
  if (!text) {
    showError(errorMsg, 'Please enter a task before adding!');
    taskInput.classList.add('shake');
    taskInput.addEventListener('animationend', () => taskInput.classList.remove('shake'), { once: true });
    return;
  }

  // --- Validation: duplicate task (case-insensitive) ---
  const isDuplicate = tasks.some(
    (t) => t.text.toLowerCase() === text.toLowerCase()
  );
  if (isDuplicate) {
    showError(errorMsg, 'This task already exists!');
    return;
  }

  // --- Build task object ---
  const newTask = {
    id:        generateId(),
    text:      text,
    completed: false,
    createdAt: Date.now(),
  };

  // Add to array, save, and re-render
  tasks.unshift(newTask); // newest task goes to the top
  saveToStorage();
  renderTasks();
  updateStats();

  // Clear input and hide any error
  taskInput.value = '';
  hideError(errorMsg);
  showToast('Task added ✦');

  // Switch filter back to "All" so the new task is visible
  setFilter('all');
}

/**
 * Toggles the completed state of a task.
 * @param {string} id - Task ID
 */
function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveToStorage();
  renderTasks();
  updateStats();

  showToast(task.completed ? 'Task completed 🎉' : 'Task reopened');
}

/**
 * Removes a task with an exit animation.
 * @param {string} id - Task ID
 */
function deleteTask(id) {
  // Find the DOM element and animate it out first
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing');
    el.addEventListener('animationend', () => {
      // Remove from array, save, and re-render after animation
      tasks = tasks.filter((t) => t.id !== id);
      saveToStorage();
      renderTasks();
      updateStats();
      showToast('Task deleted');
    }, { once: true });
  }
}

/**
 * Opens the edit modal for a given task.
 * @param {string} id - Task ID
 */
function openEditModal(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editingTaskId    = id;
  editInput.value  = task.text;
  hideError(editErrorMsg);

  modalOverlay.classList.add('visible');
  modalOverlay.setAttribute('aria-hidden', 'false');

  // Focus the input after transition
  setTimeout(() => editInput.focus(), 150);
}

/** Closes the edit modal without saving */
function closeEditModal() {
  modalOverlay.classList.remove('visible');
  modalOverlay.setAttribute('aria-hidden', 'true');
  editingTaskId = null;
  hideError(editErrorMsg);
}

/**
 * Saves the edited task text.
 * Validates: must not be empty or duplicate.
 */
function saveEdit() {
  const newText = editInput.value.trim();

  // --- Validation: empty ---
  if (!newText) {
    showError(editErrorMsg, 'Task cannot be empty!');
    return;
  }

  // --- Validation: duplicate (ignore the current task itself) ---
  const isDuplicate = tasks.some(
    (t) => t.id !== editingTaskId && t.text.toLowerCase() === newText.toLowerCase()
  );
  if (isDuplicate) {
    showError(editErrorMsg, 'Another task with this name already exists!');
    return;
  }

  // Apply the new text
  const task = tasks.find((t) => t.id === editingTaskId);
  if (task) {
    task.text = newText;
    saveToStorage();
    renderTasks();
    showToast('Task updated ✏️');
  }

  closeEditModal();
}

/**
 * Removes all completed tasks at once.
 */
function clearCompleted() {
  const count = tasks.filter((t) => t.completed).length;
  if (count === 0) {
    showToast('No completed tasks to clear');
    return;
  }
  tasks = tasks.filter((t) => !t.completed);
  saveToStorage();
  renderTasks();
  updateStats();
  showToast(`${count} task${count > 1 ? 's' : ''} cleared`);
}

/* ============================================================
   6. RENDERING
   ============================================================ */

/**
 * Filters tasks based on the current filter mode.
 * @returns {Task[]}
 */
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter((t) => !t.completed);
    case 'completed': return tasks.filter((t) =>  t.completed);
    default:          return tasks;
  }
}

/**
 * Main render function.
 * Clears and rebuilds the task list from scratch.
 */
function renderTasks() {
  const filtered = getFilteredTasks();

  // Clear the current list
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    // Show the empty state illustration
    emptyState.classList.add('visible');
    emptyState.setAttribute('aria-hidden', 'false');
  } else {
    emptyState.classList.remove('visible');
    emptyState.setAttribute('aria-hidden', 'true');

    // Build each task element
    filtered.forEach((task, index) => {
      const li = createTaskElement(task, index);
      taskList.appendChild(li);
    });
  }
}

/**
 * Builds and returns a single <li> element for a task.
 * @param {object} task - Task object
 * @param {number} index - Position in the filtered list (used for staggered animation)
 * @returns {HTMLLIElement}
 */
function createTaskElement(task, index) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' completed' : ''}`;
  li.setAttribute('data-id', task.id);
  li.setAttribute('role', 'listitem');

  // Stagger entry animation delay
  li.style.animationDelay = `${index * 45}ms`;

  li.innerHTML = `
    <!-- Checkbox (toggle completed) -->
    <input
      type="checkbox"
      class="task-checkbox"
      id="checkbox-${task.id}"
      ${task.completed ? 'checked' : ''}
      aria-label="Mark '${escapeHtml(task.text)}' as ${task.completed ? 'incomplete' : 'complete'}"
    />

    <!-- Task text -->
    <label class="task-text" for="checkbox-${task.id}">
      ${escapeHtml(task.text)}
    </label>

    <!-- Action buttons (edit & delete) -->
    <div class="task-actions" aria-label="Task actions">
      <button
        class="action-btn edit-btn"
        data-action="edit"
        data-id="${task.id}"
        aria-label="Edit task: ${escapeHtml(task.text)}"
        title="Edit"
      >✏️</button>
      <button
        class="action-btn delete-btn"
        data-action="delete"
        data-id="${task.id}"
        aria-label="Delete task: ${escapeHtml(task.text)}"
        title="Delete"
      >🗑️</button>
    </div>
  `;

  return li;
}

/* ============================================================
   7. STATS & PROGRESS
   ============================================================ */

/**
 * Updates the stats counters and progress bar.
 * Also animates the stat number if the value changed.
 */
function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active    = total - completed;
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Animate stat numbers on change
  animateStat(totalCount,     total);
  animateStat(activeCount,    active);
  animateStat(completedCount, completed);

  // Update progress bar
  progressFill.style.width     = `${pct}%`;
  progressPercent.textContent  = `${pct}%`;
  progressTrack.setAttribute('aria-valuenow', pct);
}

/**
 * Updates a stat number element and plays a brief scale animation.
 * @param {HTMLElement} el
 * @param {number} newValue
 */
function animateStat(el, newValue) {
  if (el.textContent !== String(newValue)) {
    el.textContent = newValue;
    el.classList.add('bump');
    el.addEventListener('transitionend', () => el.classList.remove('bump'), { once: true });
  }
}

/* ============================================================
   8. FILTER LOGIC
   ============================================================ */

/**
 * Activates a filter tab and re-renders the task list.
 * @param {string} filter - 'all' | 'active' | 'completed'
 */
function setFilter(filter) {
  currentFilter = filter;

  // Update active class on filter buttons
  filterBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderTasks();
}

/* ============================================================
   9. UI HELPERS
   ============================================================ */

/**
 * Shows a validation error message.
 * @param {HTMLElement} el - The error <p> element
 * @param {string}      msg
 */
function showError(el, msg) {
  el.textContent = msg;
  el.classList.add('visible');

  // Auto-hide after 3 seconds
  clearTimeout(el._timer);
  el._timer = setTimeout(() => hideError(el), 3000);
}

/**
 * Hides a validation error message.
 * @param {HTMLElement} el
 */
function hideError(el) {
  el.classList.remove('visible');
  clearTimeout(el._timer);
}

/** Toast notification queue timer */
let toastTimer = null;

/**
 * Shows a brief toast notification at the bottom of the screen.
 * @param {string} message
 */
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

/* ============================================================
   10. EVENT LISTENERS
   ============================================================ */

// --- Add task button click ---
addTaskBtn.addEventListener('click', addTask);

// --- Enter key in task input ---
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
  // Clear error as user types
  if (errorMsg.classList.contains('visible')) hideError(errorMsg);
});

// --- Task list delegation (checkbox, edit, delete) ---
taskList.addEventListener('click', (e) => {
  const target = e.target;

  // Checkbox toggle
  if (target.classList.contains('task-checkbox')) {
    const id = target.closest('.task-item').dataset.id;
    toggleTask(id);
    return;
  }

  // Action buttons
  const btn = target.closest('[data-action]');
  if (!btn) return;

  const id     = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'edit')   openEditModal(id);
  if (action === 'delete') deleteTask(id);
});

// --- Filter buttons ---
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

// --- Clear completed ---
clearCompletedBtn.addEventListener('click', clearCompleted);

// --- Modal: Save ---
saveEditBtn.addEventListener('click', saveEdit);

// --- Modal: Cancel ---
cancelEditBtn.addEventListener('click', closeEditModal);

// --- Modal: Enter key ---
editInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeEditModal();
  if (editErrorMsg.classList.contains('visible')) hideError(editErrorMsg);
});

// --- Modal: Click overlay backdrop to close ---
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeEditModal();
});

// --- Keyboard: Escape closes modal ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('visible')) {
    closeEditModal();
  }
});

// --- Add shake keyframe dynamically (CSS-in-JS for self-contained animation) ---
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    18%  { transform: translateX(-6px); }
    36%  { transform: translateX(6px);  }
    54%  { transform: translateX(-4px); }
    72%  { transform: translateX(4px);  }
  }
  .shake { animation: shake 0.4s ease both; }
`;
document.head.appendChild(shakeStyle);

/* ============================================================
   11. START THE APP
   ============================================================ */
init();
