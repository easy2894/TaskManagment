// Хранилище данных
let appData = {
    tasks: [],
    users: [],
    roles: [],
    accounts: [],
    nextTaskId: 1,
    nextUserId: 1,
    nextRoleId: 1,
    nextAccountId: 1
};

// Текущая сессия
let currentSession = {
    user: null,
    account: null,
    role: null
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeDefaultData();
    
    // Проверяем сохраненную сессию
    const savedSession = localStorage.getItem('taskFlowSession');
    if (savedSession) {
        const session = JSON.parse(savedSession);
        const account = appData.accounts.find(a => a.id === session.accountId);
        if (account) {
            loginUser(account);
            return;
        }
    }
    
    // Показываем экран входа
    showLoginScreen();
});

// Инициализация данных по умолчанию
function initializeDefaultData() {
    // Инициализация ролей
    if (appData.roles.length === 0) {
        appData.roles = [
            {
                id: appData.nextRoleId++,
                name: 'Администратор',
                description: 'Полный доступ ко всем функциям',
                permissions: ['create', 'edit', 'delete', 'assign', 'manage_users', 'manage_roles', 'export', 'import']
            },
            {
                id: appData.nextRoleId++,
                name: 'Менеджер',
                description: 'Управление задачами и назначение',
                permissions: ['create', 'edit', 'assign']
            },
            {
                id: appData.nextRoleId++,
                name: 'Исполнитель',
                description: 'Выполнение назначенных задач',
                permissions: ['edit']
            }
        ];
    }

    // Инициализация пользователей
    if (appData.users.length === 0) {
        appData.users = [
            {
                id: appData.nextUserId++,
                name: 'Иван Петров',
                email: 'ivan@example.com',
                roleId: 1
            },
            {
                id: appData.nextUserId++,
                name: 'Мария Сидорова',
                email: 'maria@example.com',
                roleId: 2
            },
            {
                id: appData.nextUserId++,
                name: 'Алексей Смирнов',
                email: 'alexey@example.com',
                roleId: 3
            }
        ];
    }

    // Инициализация учетных записей (логин/пароль)
    if (appData.accounts.length === 0) {
        appData.accounts = [
            {
                id: appData.nextAccountId++,
                username: 'admin',
                password: 'admin123',
                userId: 1
            },
            {
                id: appData.nextAccountId++,
                username: 'manager',
                password: 'manager123',
                userId: 2
            },
            {
                id: appData.nextAccountId++,
                username: 'user',
                password: 'user123',
                userId: 3
            }
        ];
    }

    // Инициализация задач
    if (appData.tasks.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        appData.tasks = [
            {
                id: appData.nextTaskId++,
                title: 'Подготовить отчет по проекту',
                description: 'Собрать данные и составить финальный отчет',
                status: 'in_progress',
                priority: 'high',
                assigneeId: 1,
                deadline: tomorrow.toISOString(),
                createdAt: new Date().toISOString()
            },
            {
                id: appData.nextTaskId++,
                title: 'Провести встречу с клиентом',
                description: 'Обсудить требования к новому проекту',
                status: 'new',
                priority: 'medium',
                assigneeId: 2,
                deadline: nextWeek.toISOString(),
                createdAt: new Date().toISOString()
            }
        ];
    }

    saveToLocalStorage();
}

// Инициализация обработчиков событий
function initEventListeners() {
    // Форма входа
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Кнопка выхода
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Навигация
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // Модальные окна
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });

    // Кнопки создания
    document.getElementById('createTaskBtn').addEventListener('click', () => {
        if (hasPermission('create')) {
            openTaskModal();
        } else {
            showNotification('error', 'Нет доступа', 'У вас нет прав на создание задач');
        }
    });

    document.getElementById('createUserBtn').addEventListener('click', () => {
        if (hasPermission('manage_users')) {
            openUserModal();
        } else {
            showNotification('error', 'Нет доступа', 'У вас нет прав на управление пользователями');
        }
    });

    document.getElementById('createRoleBtn').addEventListener('click', () => {
        if (hasPermission('manage_roles')) {
            openRoleModal();
        } else {
            showNotification('error', 'Нет доступа', 'У вас нет прав на управление ролями');
        }
    });

    // Формы
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('roleForm').addEventListener('submit', handleRoleSubmit);

    // Фильтры
    document.getElementById('filterStatus').addEventListener('change', renderTasks);
    document.getElementById('filterPriority').addEventListener('change', renderTasks);
    document.getElementById('filterAssignee').addEventListener('change', renderTasks);

    // Импорт/Экспорт Excel
    document.getElementById('exportBtn').addEventListener('click', () => {
        if (hasPermission('export')) {
            exportToExcel();
        } else {
            showNotification('error', 'Нет доступа', 'У вас нет прав на экспорт данных');
        }
    });
    
    document.getElementById('importBtn').addEventListener('click', () => {
        if (hasPermission('import')) {
            document.getElementById('fileInput').click();
        } else {
            showNotification('error', 'Нет доступа', 'У вас нет прав на импорт данных');
        }
    });
    
    document.getElementById('fileInput').addEventListener('change', handleFileImport);
}

// Авторизация
function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const account = appData.accounts.find(a => 
        a.username === username && a.password === password
    );
    
    if (account) {
        loginUser(account);
    } else {
        showNotification('error', 'Ошибка входа', 'Неверный логин или пароль');
    }
}

function loginUser(account) {
    const user = appData.users.find(u => u.id === account.userId);
    const role = appData.roles.find(r => r.id === user.roleId);
    
    currentSession = {
        user: user,
        account: account,
        role: role
    };
    
    // Сохраняем сессию
    localStorage.setItem('taskFlowSession', JSON.stringify({
        accountId: account.id
    }));
    
    // Показываем приложение
    showApp();
    
    // Инициализируем приложение
    initEventListeners();
    updateCurrentUserDisplay();
    updateUIPermissions();
    renderTasks();
    renderUsers();
    renderRoles();
    updateAssigneeSelects();
    updateRoleSelects();
    checkDeadlines();
    setInterval(checkDeadlines, 60000);
    
    showNotification('success', 'Добро пожаловать!', `Вы вошли как ${user.name}`);
}

function handleLogout() {
    localStorage.removeItem('taskFlowSession');
    currentSession = { user: null, account: null, role: null };
    
    // Очищаем форму входа
    document.getElementById('loginForm').reset();
    
    showLoginScreen();
    showNotification('success', 'Выход', 'Вы успешно вышли из системы');
}

function fillDemoAccount(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
}

// Управление правами доступа
function hasPermission(permission) {
    if (!currentSession.role) return false;
    return currentSession.role.permissions.includes(permission);
}

function updateCurrentUserDisplay() {
    const container = document.getElementById('currentUser');
    if (currentSession.user && currentSession.role) {
        container.querySelector('.user-name-display').textContent = currentSession.user.name;
        container.querySelector('.user-role-display').textContent = currentSession.role.name;
    }
}

function updateUIPermissions() {
    // Скрываем/показываем кнопки экспорта и импорта
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    
    if (hasPermission('export')) {
        exportBtn.classList.remove('hidden');
    } else {
        exportBtn.classList.add('hidden');
    }
    
    if (hasPermission('import')) {
        importBtn.classList.remove('hidden');
    } else {
        importBtn.classList.add('hidden');
    }
    
    // Скрываем разделы управления пользователями и ролями для не-администраторов
    const usersNavItem = document.querySelector('[data-view="users"]');
    const rolesNavItem = document.querySelector('[data-view="roles"]');
    
    if (!hasPermission('manage_users')) {
        usersNavItem.style.display = 'none';
    }
    
    if (!hasPermission('manage_roles')) {
        rolesNavItem.style.display = 'none';
    }
}

// Переключение видов
function switchView(view) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    document.getElementById('tasksView').classList.add('hidden');
    document.getElementById('usersView').classList.add('hidden');
    document.getElementById('rolesView').classList.add('hidden');
    document.getElementById('taskFilters').classList.add('hidden');

    if (view === 'tasks') {
        document.getElementById('pageTitle').textContent = 'Управление задачами';
        document.getElementById('pageSubtitle').textContent = 'Создавайте, назначайте и отслеживайте задачи';
        document.getElementById('tasksView').classList.remove('hidden');
        document.getElementById('taskFilters').classList.remove('hidden');
        document.getElementById('createTaskBtn').classList.remove('hidden');
    } else if (view === 'users') {
        document.getElementById('pageTitle').textContent = 'Пользователи';
        document.getElementById('pageSubtitle').textContent = 'Управление пользователями системы';
        document.getElementById('usersView').classList.remove('hidden');
        document.getElementById('createTaskBtn').classList.add('hidden');
    } else if (view === 'roles') {
        document.getElementById('pageTitle').textContent = 'Роли и права';
        document.getElementById('pageSubtitle').textContent = 'Управление ролями и правами доступа';
        document.getElementById('rolesView').classList.remove('hidden');
        document.getElementById('createTaskBtn').classList.add('hidden');
    }
}

// Рендеринг задач
function renderTasks() {
    const container = document.getElementById('tasksList');
    const filterStatus = document.getElementById('filterStatus').value;
    const filterPriority = document.getElementById('filterPriority').value;
    const filterAssignee = document.getElementById('filterAssignee').value;

    let filteredTasks = appData.tasks;

    if (filterStatus !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
    }
    if (filterAssignee !== 'all') {
        filteredTasks = filteredTasks.filter(t => t.assigneeId == filterAssignee);
    }

    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Нет задач</h3>
                <p>Создайте первую задачу для начала работы</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTasks.map(task => {
        const assignee = appData.users.find(u => u.id === task.assigneeId);
        const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
        const isDueSoon = task.deadline && !isOverdue && 
            new Date(task.deadline) < new Date(Date.now() + 24 * 60 * 60 * 1000);

        return `
            <div class="task-card ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}" data-id="${task.id}">
                <div class="task-header">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-badges">
                        <span class="badge status-${task.status}">${getStatusLabel(task.status)}</span>
                        <span class="badge priority-${task.priority}">${getPriorityLabel(task.priority)}</span>
                    </div>
                </div>
                ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                <div class="task-meta">
                    ${assignee ? `<div class="task-meta-item">👤 ${escapeHtml(assignee.name)}</div>` : ''}
                    ${task.deadline ? `<div class="task-meta-item">📅 ${formatDate(task.deadline)}</div>` : ''}
                </div>
                <div class="task-actions">
                    ${hasPermission('edit') ? `<button class="btn-small btn-edit" onclick="editTask(${task.id})">Редактировать</button>` : ''}
                    ${hasPermission('delete') ? `<button class="btn-small btn-delete" onclick="deleteTask(${task.id})">Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг пользователей
function renderUsers() {
    const container = document.getElementById('usersList');

    if (appData.users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>Нет пользователей</h3>
                <p>Добавьте первого пользователя</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appData.users.map(user => {
        const role = appData.roles.find(r => r.id === user.roleId);
        return `
            <div class="user-card">
                <div class="user-info">
                    <div class="user-name">${escapeHtml(user.name)}</div>
                    <div class="user-email">${escapeHtml(user.email)}</div>
                    ${role ? `<div class="user-role" style="color: var(--primary); font-size: 0.85rem; margin-top: 0.25rem;">
                        ⚙ ${escapeHtml(role.name)}
                    </div>` : ''}
                </div>
                <div class="user-actions">
                    ${hasPermission('manage_users') ? `<button class="btn-small btn-edit" onclick="editUser(${user.id})">Редактировать</button>` : ''}
                    ${hasPermission('manage_users') ? `<button class="btn-small btn-delete" onclick="deleteUser(${user.id})">Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Рендеринг ролей
function renderRoles() {
    const container = document.getElementById('rolesList');

    if (appData.roles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚙</div>
                <h3>Нет ролей</h3>
                <p>Создайте первую роль</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appData.roles.map(role => {
        return `
            <div class="role-card">
                <div class="role-info">
                    <div class="role-name">${escapeHtml(role.name)}</div>
                    <div class="role-description">${escapeHtml(role.description || '')}</div>
                    <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
                        Права: ${role.permissions.map(p => getPermissionLabel(p)).join(', ')}
                    </div>
                </div>
                <div class="role-actions">
                    ${hasPermission('manage_roles') ? `<button class="btn-small btn-edit" onclick="editRole(${role.id})">Редактировать</button>` : ''}
                    ${hasPermission('manage_roles') ? `<button class="btn-small btn-delete" onclick="deleteRole(${role.id})">Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Модальные окна задач
function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    form.reset();

    updateAssigneeSelects();

    if (taskId) {
        const task = appData.tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('modalTitle').textContent = 'Редактировать задачу';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskAssignee').value = task.assigneeId || '';
            if (task.deadline) {
                document.getElementById('taskDeadline').value = new Date(task.deadline).toISOString().slice(0, 16);
            }
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Создать задачу';
        document.getElementById('taskId').value = '';
    }

    modal.classList.remove('hidden');
}

function handleTaskSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('taskId').value;
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        assigneeId: parseInt(document.getElementById('taskAssignee').value) || null,
        deadline: document.getElementById('taskDeadline').value ? 
            new Date(document.getElementById('taskDeadline').value).toISOString() : null
    };

    if (id) {
        const task = appData.tasks.find(t => t.id == id);
        Object.assign(task, taskData);
        showNotification('success', 'Успешно', 'Задача обновлена');
    } else {
        appData.tasks.push({
            id: appData.nextTaskId++,
            ...taskData,
            createdAt: new Date().toISOString()
        });
        showNotification('success', 'Успешно', 'Задача создана');
    }

    saveToLocalStorage();
    renderTasks();
    closeAllModals();
}

function editTask(id) {
    if (hasPermission('edit')) {
        openTaskModal(id);
    } else {
        showNotification('error', 'Нет доступа', 'У вас нет прав на редактирование задач');
    }
}

function deleteTask(id) {
    if (!hasPermission('delete')) {
        showNotification('error', 'Нет доступа', 'У вас нет прав на удаление задач');
        return;
    }
    
    if (confirm('Удалить эту задачу?')) {
        appData.tasks = appData.tasks.filter(t => t.id !== id);
        saveToLocalStorage();
        renderTasks();
        showNotification('success', 'Успешно', 'Задача удалена');
    }
}

// Модальные окна пользователей
function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    form.reset();

    updateRoleSelects();

    if (userId) {
        const user = appData.users.find(u => u.id === userId);
        if (user) {
            document.getElementById('userId').value = user.id;
            document.getElementById('userName').value = user.name;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userRole').value = user.roleId || '';
        }
    } else {
        document.getElementById('userId').value = '';
    }

    modal.classList.remove('hidden');
}

function handleUserSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('userId').value;
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value,
        roleId: parseInt(document.getElementById('userRole').value) || null
    };

    if (id) {
        const user = appData.users.find(u => u.id == id);
        Object.assign(user, userData);
        showNotification('success', 'Успешно', 'Пользователь обновлен');
    } else {
        appData.users.push({
            id: appData.nextUserId++,
            ...userData
        });
        showNotification('success', 'Успешно', 'Пользователь добавлен');
    }

    saveToLocalStorage();
    renderUsers();
    updateAssigneeSelects();
    closeAllModals();
}

function editUser(id) {
    if (hasPermission('manage_users')) {
        openUserModal(id);
    } else {
        showNotification('error', 'Нет доступа', 'У вас нет прав на управление пользователями');
    }
}

function deleteUser(id) {
    if (!hasPermission('manage_users')) {
        showNotification('error', 'Нет доступа', 'У вас нет прав на управление пользователями');
        return;
    }
    
    if (confirm('Удалить этого пользователя?')) {
        appData.users = appData.users.filter(u => u.id !== id);
        saveToLocalStorage();
        renderUsers();
        updateAssigneeSelects();
        showNotification('success', 'Успешно', 'Пользователь удален');
    }
}

// Модальные окна ролей
function openRoleModal(roleId = null) {
    const modal = document.getElementById('roleModal');
    const form = document.getElementById('roleForm');
    form.reset();

    if (roleId) {
        const role = appData.roles.find(r => r.id === roleId);
        if (role) {
            document.getElementById('roleId').value = role.id;
            document.getElementById('roleName').value = role.name;
            document.getElementById('roleDescription').value = role.description || '';
            
            document.getElementById('permCreate').checked = role.permissions.includes('create');
            document.getElementById('permEdit').checked = role.permissions.includes('edit');
            document.getElementById('permDelete').checked = role.permissions.includes('delete');
            document.getElementById('permAssign').checked = role.permissions.includes('assign');
            document.getElementById('permManageUsers').checked = role.permissions.includes('manage_users');
            document.getElementById('permManageRoles').checked = role.permissions.includes('manage_roles');
            document.getElementById('permExport').checked = role.permissions.includes('export');
            document.getElementById('permImport').checked = role.permissions.includes('import');
        }
    } else {
        document.getElementById('roleId').value = '';
    }

    modal.classList.remove('hidden');
}

function handleRoleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('roleId').value;
    const permissions = [];
    if (document.getElementById('permCreate').checked) permissions.push('create');
    if (document.getElementById('permEdit').checked) permissions.push('edit');
    if (document.getElementById('permDelete').checked) permissions.push('delete');
    if (document.getElementById('permAssign').checked) permissions.push('assign');
    if (document.getElementById('permManageUsers').checked) permissions.push('manage_users');
    if (document.getElementById('permManageRoles').checked) permissions.push('manage_roles');
    if (document.getElementById('permExport').checked) permissions.push('export');
    if (document.getElementById('permImport').checked) permissions.push('import');

    const roleData = {
        name: document.getElementById('roleName').value,
        description: document.getElementById('roleDescription').value,
        permissions: permissions
    };

    if (id) {
        const role = appData.roles.find(r => r.id == id);
        Object.assign(role, roleData);
        showNotification('success', 'Успешно', 'Роль обновлена');
    } else {
        appData.roles.push({
            id: appData.nextRoleId++,
            ...roleData
        });
        showNotification('success', 'Успешно', 'Роль создана');
    }

    saveToLocalStorage();
    renderRoles();
    updateRoleSelects();
    closeAllModals();
}

function editRole(id) {
    if (hasPermission('manage_roles')) {
        openRoleModal(id);
    } else {
        showNotification('error', 'Нет доступа', 'У вас нет прав на управление ролями');
    }
}

function deleteRole(id) {
    if (!hasPermission('manage_roles')) {
        showNotification('error', 'Нет доступа', 'У вас нет прав на управление ролями');
        return;
    }
    
    if (confirm('Удалить эту роль?')) {
        appData.roles = appData.roles.filter(r => r.id !== id);
        saveToLocalStorage();
        renderRoles();
        updateRoleSelects();
        showNotification('success', 'Успешно', 'Роль удалена');
    }
}

// Обновление селектов
function updateAssigneeSelects() {
    const selects = [
        document.getElementById('taskAssignee'),
        document.getElementById('filterAssignee')
    ];

    selects.forEach(select => {
        const currentValue = select.value;
        const isFilter = select.id === 'filterAssignee';
        
        select.innerHTML = isFilter ? 
            '<option value="all">Все</option>' : 
            '<option value="">Не назначен</option>';

        appData.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function updateRoleSelects() {
    const select = document.getElementById('userRole');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Не назначена</option>';

    appData.roles.forEach(role => {
        const option = document.createElement('option');
        option.value = role.id;
        option.textContent = role.name;
        select.appendChild(option);
    });

    if (currentValue) {
        select.value = currentValue;
    }
}

// Проверка дедлайнов
function checkDeadlines() {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    appData.tasks.forEach(task => {
        if (!task.deadline || task.status === 'completed') return;

        const deadline = new Date(task.deadline);
        const notificationKey = `notified_${task.id}_${task.deadline}`;

        if (deadline < now && !localStorage.getItem(notificationKey + '_overdue')) {
            showNotification('error', 'Просрочен дедлайн!', 
                `Задача "${task.title}" просрочена`);
            localStorage.setItem(notificationKey + '_overdue', 'true');
        } else if (deadline > now && deadline < oneDayFromNow && 
                   !localStorage.getItem(notificationKey + '_soon')) {
            showNotification('warning', 'Скоро дедлайн!', 
                `Задача "${task.title}" должна быть выполнена сегодня`);
            localStorage.setItem(notificationKey + '_soon', 'true');
        }
    });
}

// Уведомления
function showNotification(type, title, message) {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠'
    };

    notification.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Экспорт в Excel
function exportToExcel() {
    const workbook = XLSX.utils.book_new();

    // Лист задач
    const tasksData = appData.tasks.map(task => {
        const assignee = appData.users.find(u => u.id === task.assigneeId);
        return {
            'ID': task.id,
            'Название': task.title,
            'Описание': task.description || '',
            'Статус': getStatusLabel(task.status),
            'Приоритет': getPriorityLabel(task.priority),
            'Ответственный': assignee ? assignee.name : '',
            'Дедлайн': task.deadline ? formatDate(task.deadline) : '',
            'Дата создания': formatDate(task.createdAt)
        };
    });
    const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Задачи');

    // Лист пользователей
    const usersData = appData.users.map(user => {
        const role = appData.roles.find(r => r.id === user.roleId);
        return {
            'ID': user.id,
            'Имя': user.name,
            'Email': user.email,
            'Роль': role ? role.name : ''
        };
    });
    const usersSheet = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Пользователи');

    // Лист ролей
    const rolesData = appData.roles.map(role => ({
        'ID': role.id,
        'Название': role.name,
        'Описание': role.description || '',
        'Права': role.permissions.map(p => getPermissionLabel(p)).join(', ')
    }));
    const rolesSheet = XLSX.utils.json_to_sheet(rolesData);
    XLSX.utils.book_append_sheet(workbook, rolesSheet, 'Роли');

    // Лист учетных записей
    const accountsData = appData.accounts.map(account => {
        const user = appData.users.find(u => u.id === account.userId);
        return {
            'ID': account.id,
            'Логин': account.username,
            'Пароль': account.password,
            'Пользователь': user ? user.name : ''
        };
    });
    const accountsSheet = XLSX.utils.json_to_sheet(accountsData);
    XLSX.utils.book_append_sheet(workbook, accountsSheet, 'Учетные записи');

    XLSX.writeFile(workbook, `TaskFlow_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('success', 'Успешно', 'Данные экспортированы в Excel');
}

// Импорт из Excel
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Импорт ролей (сначала)
            if (workbook.SheetNames.includes('Роли')) {
                const rolesSheet = workbook.Sheets['Роли'];
                const rolesData = XLSX.utils.sheet_to_json(rolesSheet);
                
                appData.roles = rolesData.map((row, index) => ({
                    id: appData.nextRoleId++,
                    name: row['Название'] || `Роль ${index + 1}`,
                    description: row['Описание'] || '',
                    permissions: parsePermissions(row['Права'])
                }));
            }

            // Импорт пользователей
            if (workbook.SheetNames.includes('Пользователи')) {
                const usersSheet = workbook.Sheets['Пользователи'];
                const usersData = XLSX.utils.sheet_to_json(usersSheet);
                
                appData.users = usersData.map((row, index) => {
                    const roleName = row['Роль'];
                    const role = appData.roles.find(r => r.name === roleName);
                    
                    return {
                        id: appData.nextUserId++,
                        name: row['Имя'] || `Пользователь ${index + 1}`,
                        email: row['Email'] || '',
                        roleId: role ? role.id : null
                    };
                });
            }

            // Импорт учетных записей
            if (workbook.SheetNames.includes('Учетные записи')) {
                const accountsSheet = workbook.Sheets['Учетные записи'];
                const accountsData = XLSX.utils.sheet_to_json(accountsSheet);
                
                appData.accounts = accountsData.map((row, index) => {
                    const userName = row['Пользователь'];
                    const user = appData.users.find(u => u.name === userName);
                    
                    return {
                        id: appData.nextAccountId++,
                        username: row['Логин'] || `user${index + 1}`,
                        password: row['Пароль'] || 'password',
                        userId: user ? user.id : null
                    };
                });
            }

            // Импорт задач
            if (workbook.SheetNames.includes('Задачи')) {
                const tasksSheet = workbook.Sheets['Задачи'];
                const tasksData = XLSX.utils.sheet_to_json(tasksSheet);
                
                appData.tasks = tasksData.map((row, index) => {
                    const assigneeName = row['Ответственный'];
                    const assignee = appData.users.find(u => u.name === assigneeName);
                    
                    return {
                        id: appData.nextTaskId++,
                        title: row['Название'] || `Задача ${index + 1}`,
                        description: row['Описание'] || '',
                        status: parseStatus(row['Статус']),
                        priority: parsePriority(row['Приоритет']),
                        assigneeId: assignee ? assignee.id : null,
                        deadline: row['Дедлайн'] ? parseExcelDate(row['Дедлайн']) : null,
                        createdAt: row['Дата создания'] ? parseExcelDate(row['Дата создания']) : new Date().toISOString()
                    };
                });
            }

            saveToLocalStorage();
            renderTasks();
            renderUsers();
            renderRoles();
            updateAssigneeSelects();
            updateRoleSelects();
            showNotification('success', 'Успешно', 'Данные импортированы из Excel');
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('error', 'Ошибка', 'Не удалось импортировать файл');
        }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

// Вспомогательные функции
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function saveToLocalStorage() {
    localStorage.setItem('taskFlowData', JSON.stringify(appData));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('taskFlowData');
    if (saved) {
        appData = JSON.parse(saved);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusLabel(status) {
    const labels = {
        'new': 'Новая',
        'in_progress': 'В работе',
        'review': 'На проверке',
        'completed': 'Завершена'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий'
    };
    return labels[priority] || priority;
}

function getPermissionLabel(permission) {
    const labels = {
        'create': 'Создание',
        'edit': 'Редактирование',
        'delete': 'Удаление',
        'assign': 'Назначение',
        'manage_users': 'Управление пользователями',
        'manage_roles': 'Управление ролями',
        'export': 'Экспорт',
        'import': 'Импорт'
    };
    return labels[permission] || permission;
}

function parseStatus(statusLabel) {
    const map = {
        'Новая': 'new',
        'В работе': 'in_progress',
        'На проверке': 'review',
        'Завершена': 'completed'
    };
    return map[statusLabel] || 'new';
}

function parsePriority(priorityLabel) {
    const map = {
        'Низкий': 'low',
        'Средний': 'medium',
        'Высокий': 'high'
    };
    return map[priorityLabel] || 'medium';
}

function parsePermissions(permissionsStr) {
    if (!permissionsStr) return [];
    const map = {
        'Создание': 'create',
        'Редактирование': 'edit',
        'Удаление': 'delete',
        'Назначение': 'assign',
        'Управление пользователями': 'manage_users',
        'Управление ролями': 'manage_roles',
        'Экспорт': 'export',
        'Импорт': 'import'
    };
    return permissionsStr.split(',').map(p => map[p.trim()]).filter(Boolean);
}

function parseExcelDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Пробуем парсить как дату
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
        // Если это Excel serial date
        if (typeof dateStr === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + dateStr * 86400000);
            return jsDate.toISOString();
        }
    } catch (e) {
        console.error('Ошибка парсинга даты:', e);
    }
    return null;
}
