// Registration form handler
if (document.getElementById('registrationForm')) {
    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageDiv = document.getElementById('message');
        
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });
            
            const data = await response.json();
            
            messageDiv.textContent = data.message;
            messageDiv.className = data.success ? 'success' : 'error';
            
            if (data.success) {
                // Redirect to login page after successful registration
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
        } catch (error) {
            messageDiv.textContent = 'An error occurred during registration';
            messageDiv.className = 'error';
        }
    });
}

// Login form handler
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const messageDiv = document.getElementById('message');
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            console.log('Login response:', data);
            
            messageDiv.textContent = data.message;
            messageDiv.className = data.success ? 'success' : 'error';
            
            if (data.success) {
                // Store username in localStorage for profile page
                localStorage.setItem('username', username);
                // Redirect to profile page after successful login
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Login error:', error);
            messageDiv.textContent = 'An error occurred during login';
            messageDiv.className = 'error';
        }
    });
}

async function fetchUserInfo() {
    try {
        const response = await fetch('/user');
        const data = await response.json();
        if (data.success) {
            const { username, email, avatar } = data.user;
            const profileContent = document.getElementById('profileContent');
            profileContent.innerHTML = `
                <div class="avatar-container" style="position: relative; display: inline-block; margin-bottom: 15px;">
                    <img id="avatarImage" src="uploads/${avatar ? avatar : 'avatar.png'}" alt="Avatar" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 2px solid #ccc;">
                    <div id="changePhotoOverlay" style="position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; text-align: center; cursor: pointer; border-bottom-left-radius: 50%; border-bottom-right-radius: 50%; font-size: 14px; padding: 5px 0;">
                        Change Photo
                    </div>
                    <input type="file" id="avatarInput" accept="image/*" style="display: none;">
                </div>
                <p><strong>Username:</strong> ${username}</p>
                <p><strong>Email:</strong> ${email}</p>
            `;

            // Add event listeners for avatar change
            const changePhotoOverlay = document.getElementById('changePhotoOverlay');
            const avatarInput = document.getElementById('avatarInput');
            const avatarImage = document.getElementById('avatarImage');

            changePhotoOverlay.addEventListener('click', () => {
                avatarInput.click();
            });

            avatarInput.addEventListener('change', async () => {
                const file = avatarInput.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('avatar', file);

                try {
                    const uploadResponse = await fetch('/upload-avatar', {
                        method: 'POST',
                        body: formData,
                    });
                    const uploadData = await uploadResponse.json();
                    if (uploadData.success) {
                        // Update avatar image src with cache busting
                        avatarImage.src = `uploads/${uploadData.filename}?t=${Date.now()}`;
                    } else {
                        alert('Failed to upload avatar: ' + uploadData.message);
                    }
                } catch (error) {
                    alert('Error uploading avatar');
                }
            });
        } else {
            window.location.href = 'login.html';
        }
    } catch (error) {
        window.location.href = 'login.html';
    }
}

if (document.getElementById('profileUsername')) {
    fetchUserInfo();
}

// Todo app logic
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');
const todoStats = document.getElementById('todoStats');

let todos = [];

async function fetchTodos() {
    try {
        const response = await fetch('/todos');
        const data = await response.json();
        if (data.success) {
            todos = data.todos;
            renderTodos();
        }
    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}

function renderTodos() {
    todoList.innerHTML = '';
    let completedCount = 0;
    let uncompletedCount = 0;

    todos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        todoItem.style.backgroundColor = '#333';
        todoItem.style.color = 'white';
        todoItem.style.borderRadius = '5px';
        todoItem.style.marginBottom = '5px';

        const leftDiv = document.createElement('div');
        leftDiv.className = 'd-flex align-items-center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.className = 'form-check-input me-2';
        checkbox.addEventListener('change', () => toggleTodoCompleted(todo.id, checkbox.checked));

        const todoText = document.createElement('span');
        todoText.textContent = todo.text;
        if (todo.completed) {
            todoText.style.textDecoration = 'line-through';
            completedCount++;
        } else {
            uncompletedCount++;
        }

        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(todoText);

        const rightDiv = document.createElement('div');

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn btn-sm btn-danger me-2';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'btn btn-sm btn-secondary';
        editBtn.addEventListener('click', () => editTodo(todo.id));

        rightDiv.appendChild(deleteBtn);
        rightDiv.appendChild(editBtn);

        todoItem.appendChild(leftDiv);
        todoItem.appendChild(rightDiv);

        todoList.appendChild(todoItem);
    });

    todoStats.textContent = `Completed: ${completedCount} | Uncompleted: ${uncompletedCount}`;
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;
    try {
        const response = await fetch('/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        if (data.success) {
            todos.push(data.todo);
            renderTodos();
            todoInput.value = '';
        }
    } catch (error) {
        console.error('Error adding todo:', error);
    }
}

function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const newText = prompt('Edit todo:', todo.text);
    if (newText === null) return; // Cancelled
    updateTodo(id, { text: newText });
}

async function updateTodo(id, updates) {
    try {
        const response = await fetch(`/todos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const data = await response.json();
        if (data.success) {
            const index = todos.findIndex(t => t.id === id);
            if (index !== -1) {
                todos[index] = data.todo;
                renderTodos();
            }
        }
    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

async function toggleTodoCompleted(id, completed) {
    await updateTodo(id, { completed });
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`/todos/${id}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// Fetch todos on page load
fetchTodos();
