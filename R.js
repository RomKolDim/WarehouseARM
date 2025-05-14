document.addEventListener('DOMContentLoaded', function() {
    // Основной объект базы данных
    let db = {
        users: [],
        products: [],
        categories: [],
        suppliers: [],
        settings: {
            lowStockThreshold: 5
        }
    };

    // Текущий пользователь
    let currentUser = null;
    const DB_KEY = 'warehouseDB';

    // Инициализация приложения
    initApp();

    async function initApp() {
        await loadDB();
        setupThemeToggle();
        setupNavigation();
        setupModals();
        setupAuth();
        setupProducts();
        setupReports();
        
        if (currentUser) {
            loadInitialData();
        }
    }

    // ==================== Работа с данными ====================

    async function loadDB() {
        try {
            // Пытаемся загрузить из localStorage
            const savedData = localStorage.getItem(DB_KEY);
            if (savedData) {
                db = JSON.parse(savedData);
                console.log('Данные загружены из localStorage');
            } else {
                // Если нет сохраненных данных, загружаем начальные из db.json
                const response = await fetch('db.json');
                if (!response.ok) throw new Error('Ошибка загрузки данных');
                const data = await response.json();
                db = {...db, ...data};
                console.log('Данные загружены из db.json');
                await saveDB();
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            await initializeDefaultDB();
        }
    }

    async function initializeDefaultDB() {
        db = {
            users: [
                {id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Администратор'},
                {id: 2, username: 'storekeeper', password: 'store123', role: 'storekeeper', name: 'Иванов И.И.'}
            ],
            products: [
                {id: 1, article: '1001', name: 'Клавиатура Logitech', category: 'Компьютерные аксессуары', 
                 quantity: 15, supplier: 'ООО "ТехноПоставка"', expiry: null, minQuantity: 5},
                {id: 2, article: '1002', name: 'Мышь беспроводная', category: 'Компьютерные аксессуары', 
                 quantity: 8, supplier: 'ООО "ТехноПоставка"', expiry: null, minQuantity: 5},
                {id: 3, article: '2001', name: 'Бумага офисная', category: 'Канцелярия', 
                 quantity: 2, supplier: 'ООО "ОфисМаркет"', expiry: '2023-12-31', minQuantity: 10}
            ],
            categories: ['Компьютерные аксессуары', 'Канцелярия', 'Оргтехника', 'Хозяйственные товары'],
            suppliers: ['ООО "ТехноПоставка"', 'ООО "ОфисМаркет"', 'ООО "Складские решения"'],
            settings: {
                lowStockThreshold: 5
            }
        };
        await saveDB();
    }

    async function saveDB() {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        console.log('Данные сохранены в localStorage');
        return new Promise(resolve => resolve());
    }

    // ==================== Основные функции ====================

    function setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-theme', savedTheme === 'dark');
        themeToggle.textContent = savedTheme === 'dark' ? 'Светлая тема' : 'Темная тема';
        
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            themeToggle.textContent = isDark ? 'Светлая тема' : 'Темная тема';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                
                navLinks.forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(sectionId).classList.add('active');
                
                loadSectionData(sectionId);
            });
        });
    }

    function setupModals() {
        const modals = document.querySelectorAll('.modal');
        const closeButtons = document.querySelectorAll('.modal .close');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    function setupAuth() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const loginModal = document.getElementById('login-modal');
        const loginForm = document.getElementById('login-form');
        
        loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
        
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const user = db.users.find(u => u.username === username && u.password === password);
            
            if (user) {
                currentUser = user;
                document.getElementById('user-name').textContent = user.name;
                document.getElementById('user-role').textContent = user.role;
                document.getElementById('user-role').style.display = 'inline';
                loginBtn.style.display = 'none';
                logoutBtn.style.display = 'inline-block';
                loginModal.style.display = 'none';
                
                loadInitialData();
                updateUIForRole(user.role);
            } else {
                alert('Неверные логин или пароль');
            }
        });
        
        logoutBtn.addEventListener('click', function() {
            currentUser = null;
            document.getElementById('user-name').textContent = 'Гость';
            document.getElementById('user-role').textContent = '';
            document.getElementById('user-role').style.display = 'none';
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            
            clearUserData();
            resetUI();
        });
    }

    function updateUIForRole(role) {
        const elementsToToggle = document.querySelectorAll('[data-role]');
        elementsToToggle.forEach(element => {
            const requiredRole = element.getAttribute('data-role');
            element.style.display = role === requiredRole ? 'inline-block' : 'none';
        });
    }

    function setupProducts() {
        const addProductBtn = document.getElementById('add-product');
        const productModal = document.getElementById('product-modal');
        const productForm = document.getElementById('product-form');
        const categoryFilter = document.getElementById('category-filter');
        const productSearch = document.getElementById('product-search');
        
        updateCategoryFilters();
        
        addProductBtn.addEventListener('click', function() {
            if (!currentUser) {
                alert('Для добавления товара необходимо авторизоваться');
                return;
            }
            document.getElementById('product-modal-title').textContent = 'Добавить товар';
            productForm.reset();
            document.getElementById('product-id').value = '';
            productModal.style.display = 'block';
        });
        
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentUser) {
                alert('Доступ запрещен');
                return;
            }
            
            const productId = document.getElementById('product-id').value;
            const productData = {
                article: document.getElementById('product-article').value,
                name: document.getElementById('product-name').value,
                category: document.getElementById('product-category').value,
                quantity: parseInt(document.getElementById('product-quantity').value) || 0,
                supplier: document.getElementById('product-supplier').value,
                expiry: document.getElementById('product-expiry').value || null,
                minQuantity: parseInt(document.getElementById('product-min-quantity').value) || 0,
                description: document.getElementById('product-description').value
            };
            
            try {
                if (productId) {
                    await updateProduct(productId, productData);
                } else {
                    await addProduct(productData);
                }
                
                productModal.style.display = 'none';
                loadProductsTable();
                loadDashboardData();
                alert('Товар успешно сохранен!');
            } catch (error) {
                console.error('Ошибка сохранения:', error);
                alert('Ошибка при сохранении товара');
            }
        });
        
        categoryFilter.addEventListener('change', loadProductsTable);
        productSearch.addEventListener('input', loadProductsTable);
        
        document.getElementById('products-table').addEventListener('click', function(e) {
            if (!currentUser) {
                alert('Для редактирования товаров необходимо авторизоваться');
                return;
            }
            
            if (e.target.classList.contains('edit-btn')) {
                const productId = e.target.closest('tr').dataset.id;
                editProduct(productId);
            } else if (e.target.classList.contains('delete-btn')) {
                const productId = e.target.closest('tr').dataset.id;
                if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                    deleteProduct(productId);
                }
            }
        });
    }

    async function addProduct(productData) {
        const newId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
        db.products.push({
            id: newId,
            ...productData
        });
        
        if (!db.categories.includes(productData.category)) {
            db.categories.push(productData.category);
            updateCategoryFilters();
        }
        
        if (productData.supplier && !db.suppliers.includes(productData.supplier)) {
            db.suppliers.push(productData.supplier);
        }
        
        await saveDB();
    }

    async function updateProduct(id, productData) {
        const index = db.products.findIndex(p => p.id == id);
        if (index !== -1) {
            db.products[index] = { ...db.products[index], ...productData };
            await saveDB();
        }
    }

    async function deleteProduct(id) {
        db.products = db.products.filter(p => p.id != id);
        await saveDB();
        loadProductsTable();
        loadDashboardData();
    }

    function editProduct(id) {
        const product = db.products.find(p => p.id == id);
        if (product) {
            document.getElementById('product-modal-title').textContent = 'Редактировать товар';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-article').value = product.article;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-quantity').value = product.quantity;
            document.getElementById('product-supplier').value = product.supplier || '';
            document.getElementById('product-expiry').value = product.expiry || '';
            document.getElementById('product-min-quantity').value = product.minQuantity || '';
            document.getElementById('product-description').value = product.description || '';
            
            document.getElementById('product-modal').style.display = 'block';
        }
    }

    function updateCategoryFilters() {
        const categoryFilter = document.getElementById('category-filter');
        const productCategorySelect = document.getElementById('product-category');
        
        categoryFilter.innerHTML = '<option value="">Все категории</option>';
        productCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';
        
        db.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option.cloneNode(true));
            productCategorySelect.appendChild(option);
        });
    }

    // ==================== Отчеты ====================

    function setupReports() {
        document.getElementById('generate-report').addEventListener('click', generateReport);
        document.getElementById('print-report').addEventListener('click', printReport);
    }

    function generateReport() {
        const reportType = document.getElementById('report-type').value;
        const tableBody = document.querySelector('#report-table tbody');
        tableBody.innerHTML = '';
        
        let reportData = [];
        let columns = [];
        
        switch(reportType) {
            case 'stock':
                columns = ['Артикул', 'Наименование', 'Категория', 'Количество', 'Поставщик'];
                reportData = db.products.map(p => [
                    p.article, p.name, p.category, p.quantity, p.supplier || '-'
                ]);
                break;
                
            case 'expiry':
                columns = ['Артикул', 'Наименование', 'Количество', 'Срок годности', 'Дней осталось'];
                reportData = db.products
                    .filter(p => p.expiry)
                    .map(p => {
                        const expiryDate = new Date(p.expiry);
                        const today = new Date();
                        const diffTime = expiryDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return [
                            p.article, p.name, p.quantity, p.expiry, 
                            diffDays > 0 ? diffDays : 'Просрочено'
                        ];
                    });
                break;
                
            default:
                columns = ['Артикул', 'Наименование', 'Количество'];
                reportData = db.products.map(p => [p.article, p.name, p.quantity]);
        }
        
        // Заполняем заголовки таблицы
        const tableHead = document.querySelector('#report-table thead');
        tableHead.innerHTML = '<tr>' + columns.map(col => `<th>${col}</th>`).join('') + '</tr>';
        
        // Заполняем тело таблицы
        reportData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = row.map(cell => `<td>${cell}</td>`).join('');
            tableBody.appendChild(tr);
        });
        
        // Математическое моделирование - прогнозирование остатков
        if (reportType === 'stock') {
            const modelingResults = modelStockConsumption();
            const modelingRow = document.createElement('tr');
            modelingRow.innerHTML = `
                <td colspan="${columns.length}" style="text-align: center; font-weight: bold;">
                    Прогноз исчерпания запасов: ${modelingResults.daysToStockout} дней
                    (${modelingResults.lowStockItems.join(', ')})
                </td>
            `;
            tableBody.appendChild(modelingRow);
        }
    }

    function modelStockConsumption() {
        // Простая модель прогнозирования - на основе среднего расхода
        const lowStockItems = db.products
            .filter(p => p.minQuantity > 0 && p.quantity <= p.minQuantity)
            .map(p => p.name);
        
        // Упрощенный расчет дней до исчерпания запасов
        const daysToStockout = lowStockItems.length > 0 ? 
            Math.floor(30 / lowStockItems.length) : 
            0;
        
        return {
            daysToStockout,
            lowStockItems: lowStockItems.length > 0 ? lowStockItems : ['нет товаров с низким запасом']
        };
    }

    function printReport() {
        window.print();
    }

    // ==================== Вспомогательные функции ====================

    function loadInitialData() {
        loadDashboardData();
        loadProductsTable();
    }

    function loadSectionData(sectionId) {
        switch(sectionId) {
            case 'dashboard': loadDashboardData(); break;
            case 'products': loadProductsTable(); break;
            case 'reports': generateReport(); break;
        }
    }

    function loadDashboardData() {
        document.getElementById('total-products').textContent = db.products.length;
        
        const lowStock = db.products.filter(p => 
            p.minQuantity > 0 && p.quantity <= p.minQuantity
        ).length;
        document.getElementById('low-stock').textContent = lowStock;
        
        const expired = db.products.filter(p => 
            p.expiry && new Date(p.expiry) < new Date()
        ).length;
        document.getElementById('expired').textContent = expired;
    }

    function loadProductsTable() {
        const tableBody = document.querySelector('#products-table tbody');
        const categoryFilter = document.getElementById('category-filter').value;
        const searchTerm = document.getElementById('product-search').value.toLowerCase();
        
        tableBody.innerHTML = '';
        
        const filteredProducts = db.products.filter(product => {
            const matchesCategory = !categoryFilter || product.category === categoryFilter;
            const matchesSearch = !searchTerm || 
                product.article.toLowerCase().includes(searchTerm) || 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.supplier && product.supplier.toLowerCase().includes(searchTerm));
            
            return matchesCategory && matchesSearch;
        });
        
        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            row.dataset.id = product.id;
            
            if (product.minQuantity > 0 && product.quantity <= product.minQuantity) {
                row.classList.add('warning');
            }
            if (product.expiry && new Date(product.expiry) < new Date()) {
                row.classList.add('danger');
            }
            
            row.innerHTML = `
                <td>${product.article}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td>${product.supplier || '-'}</td>
                <td>${product.expiry || '-'}</td>
                <td>
                    <button class="edit-btn" ${!currentUser ? 'disabled' : ''}>Редактировать</button>
                    ${currentUser && currentUser.role === 'admin' ? 
                      '<button class="delete-btn">Удалить</button>' : ''}
                </td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    function clearUserData() {
        document.querySelectorAll('table tbody').forEach(tbody => {
            tbody.innerHTML = '';
        });
        
        document.getElementById('total-products').textContent = '0';
        document.getElementById('low-stock').textContent = '0';
        document.getElementById('expired').textContent = '0';
    }

    function resetUI() {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('dashboard').classList.add('active');
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector('.nav-link[data-section="dashboard"]').classList.add('active');
    }
});