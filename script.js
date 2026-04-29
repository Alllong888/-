(function () {
    "use strict";

    const STORAGE_KEY = "todo-app-items-v1";

    const elements = {
        form: document.getElementById("todoForm"),
        input: document.getElementById("todoInput"),
        list: document.getElementById("todoList"),
        emptyState: document.getElementById("emptyState"),
        dateDisplay: document.getElementById("dateDisplay"),
        totalCount: document.getElementById("totalCount"),
        activeCount: document.getElementById("activeCount"),
        completedCount: document.getElementById("completedCount"),
        clearCompleted: document.getElementById("clearCompleted"),
        filterButtons: document.querySelectorAll(".filter-btn"),
    };

    let todos = loadTodos();
    let currentFilter = "all";

    function loadTodos() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (err) {
            console.warn("读取本地数据失败：", err);
            return [];
        }
    }

    function saveTodos() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
        } catch (err) {
            console.warn("保存本地数据失败：", err);
        }
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return "刚刚";
        if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;

        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${m}-${d}`;
    }

    function updateDateDisplay() {
        const now = new Date();
        const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        const text = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${weekdays[now.getDay()]}`;
        elements.dateDisplay.textContent = text;
    }

    function getFilteredTodos() {
        switch (currentFilter) {
            case "active":
                return todos.filter((t) => !t.completed);
            case "completed":
                return todos.filter((t) => t.completed);
            default:
                return todos;
        }
    }

    function addTodo(text) {
        const trimmed = text.trim();
        if (!trimmed) return;

        todos.unshift({
            id: generateId(),
            text: trimmed,
            completed: false,
            createdAt: Date.now(),
        });
        saveTodos();
        render();
    }

    function toggleTodo(id) {
        const todo = todos.find((t) => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            saveTodos();
            render();
        }
    }

    function deleteTodo(id) {
        const li = elements.list.querySelector(`[data-id="${id}"]`);
        if (li) {
            li.classList.add("removing");
            setTimeout(() => {
                todos = todos.filter((t) => t.id !== id);
                saveTodos();
                render();
            }, 240);
        }
    }

    function editTodo(id, newText) {
        const trimmed = newText.trim();
        if (!trimmed) {
            deleteTodo(id);
            return;
        }
        const todo = todos.find((t) => t.id === id);
        if (todo && todo.text !== trimmed) {
            todo.text = trimmed;
            saveTodos();
        }
        render();
    }

    function clearCompleted() {
        const hasCompleted = todos.some((t) => t.completed);
        if (!hasCompleted) return;
        if (!confirm("确定要清除所有已完成的任务吗？")) return;
        todos = todos.filter((t) => !t.completed);
        saveTodos();
        render();
    }

    function startEditing(li, todo) {
        const textEl = li.querySelector(".todo-text");
        if (!textEl) return;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "todo-edit-input";
        input.value = todo.text;
        input.maxLength = 100;

        textEl.replaceWith(input);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);

        let finished = false;
        const finish = (commit) => {
            if (finished) return;
            finished = true;
            if (commit) {
                editTodo(todo.id, input.value);
            } else {
                render();
            }
        };

        input.addEventListener("blur", () => finish(true));
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                finish(true);
            } else if (e.key === "Escape") {
                e.preventDefault();
                finish(false);
            }
        });
    }

    function createTodoItem(todo) {
        const li = document.createElement("li");
        li.className = "todo-item" + (todo.completed ? " completed" : "");
        li.dataset.id = todo.id;

        const checkbox = document.createElement("div");
        checkbox.className = "todo-checkbox";
        checkbox.setAttribute("role", "checkbox");
        checkbox.setAttribute("aria-checked", String(todo.completed));
        checkbox.tabIndex = 0;
        checkbox.addEventListener("click", () => toggleTodo(todo.id));
        checkbox.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleTodo(todo.id);
            }
        });

        const text = document.createElement("span");
        text.className = "todo-text";
        text.textContent = todo.text;
        text.title = "双击编辑";
        text.addEventListener("dblclick", () => startEditing(li, todo));

        const time = document.createElement("span");
        time.className = "todo-time";
        time.textContent = formatTime(todo.createdAt);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "todo-delete";
        deleteBtn.setAttribute("aria-label", "删除任务");
        deleteBtn.innerHTML =
            '<svg viewBox="0 0 24 24" width="16" height="16">' +
            '<path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>' +
            "</svg>";
        deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

        li.appendChild(checkbox);
        li.appendChild(text);
        li.appendChild(time);
        li.appendChild(deleteBtn);

        return li;
    }

    function updateStats() {
        const total = todos.length;
        const completed = todos.filter((t) => t.completed).length;
        elements.totalCount.textContent = total;
        elements.activeCount.textContent = total - completed;
        elements.completedCount.textContent = completed;
    }

    function render() {
        const filtered = getFilteredTodos();
        elements.list.innerHTML = "";

        if (filtered.length === 0) {
            elements.emptyState.classList.add("show");
            const emptyText = elements.emptyState.querySelector(".empty-text");
            const emptyHint = elements.emptyState.querySelector(".empty-hint");
            if (todos.length === 0) {
                emptyText.textContent = "还没有任务";
                emptyHint.textContent = "添加一条任务开始你的高效一天吧！";
            } else if (currentFilter === "active") {
                emptyText.textContent = "全部完成啦！";
                emptyHint.textContent = "你今天非常高效 🎉";
            } else {
                emptyText.textContent = "暂无已完成任务";
                emptyHint.textContent = "完成一些任务后会显示在这里";
            }
        } else {
            elements.emptyState.classList.remove("show");
            const fragment = document.createDocumentFragment();
            filtered.forEach((todo) => fragment.appendChild(createTodoItem(todo)));
            elements.list.appendChild(fragment);
        }

        updateStats();
    }

    function bindEvents() {
        elements.form.addEventListener("submit", (e) => {
            e.preventDefault();
            addTodo(elements.input.value);
            elements.input.value = "";
            elements.input.focus();
        });

        elements.filterButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                currentFilter = btn.dataset.filter;
                elements.filterButtons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                render();
            });
        });

        elements.clearCompleted.addEventListener("click", clearCompleted);

        window.addEventListener("storage", (e) => {
            if (e.key === STORAGE_KEY) {
                todos = loadTodos();
                render();
            }
        });
    }

    function init() {
        updateDateDisplay();
        bindEvents();
        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
