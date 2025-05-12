const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Serve static files from public directory
app.use(express.static('public'));

// Multer setup for avatar uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const filename = req.session.user + '_avatar' + ext;
        cb(null, filename);
    }
});
const upload = multer({ storage: storage });

// Initialize users.json if it doesn't exist
const usersFile = path.join(__dirname, 'data', 'users.json');
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
}

// Registration endpoint
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));
    
    if (users.find(user => user.username === username)) {
        return res.json({ success: false, message: 'Username already exists' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Add todos array to new user
        users.push({ username, email, password: hashedPassword, todos: [], avatar: null });
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        
        req.session.user = username;
        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        res.json({ success: false, message: 'Error registering user' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));
    
    const user = users.find(user => user.username === username);
    
    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = username;
            return res.json({ success: true, message: 'Login successful' });
        }
    }
    res.json({ success: false, message: 'Invalid username or password' });
});

// Get user info endpoint (include avatar)
app.get('/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.username === req.session.user);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    // Return user info excluding password, ensure avatar field exists
    const { username, email } = user;
    const avatar = user.avatar ? user.avatar : null;
    res.json({ success: true, user: { username, email, avatar } });
});

// Upload avatar endpoint
app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const users = JSON.parse(fs.readFileSync(usersFile));
    const userIndex = users.findIndex(u => u.username === req.session.user);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    users[userIndex].avatar = req.file.filename;
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true, message: 'Avatar uploaded successfully', filename: req.file.filename });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Get todos for logged-in user
app.get('/todos', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const users = JSON.parse(fs.readFileSync(usersFile));
    const user = users.find(u => u.username === req.session.user);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, todos: user.todos || [] });
});

// Add a new todo
app.post('/todos', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, message: 'Todo text is required' });
    }
    const users = JSON.parse(fs.readFileSync(usersFile));
    const userIndex = users.findIndex(u => u.username === req.session.user);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const newTodo = {
        id: Date.now().toString(),
        text,
        completed: false
    };
    users[userIndex].todos = users[userIndex].todos || [];
    users[userIndex].todos.push(newTodo);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true, todo: newTodo });
});

// Update a todo (edit text or toggle completed)
app.put('/todos/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { id } = req.params;
    const { text, completed } = req.body;
    const users = JSON.parse(fs.readFileSync(usersFile));
    const userIndex = users.findIndex(u => u.username === req.session.user);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const todos = users[userIndex].todos || [];
    const todoIndex = todos.findIndex(t => t.id === id);
    if (todoIndex === -1) {
        return res.status(404).json({ success: false, message: 'Todo not found' });
    }
    if (text !== undefined) {
        todos[todoIndex].text = text;
    }
    if (completed !== undefined) {
        todos[todoIndex].completed = completed;
    }
    users[userIndex].todos = todos;
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true, todo: todos[todoIndex] });
});

// Delete a todo
app.delete('/todos/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const { id } = req.params;
    const users = JSON.parse(fs.readFileSync(usersFile));
    const userIndex = users.findIndex(u => u.username === req.session.user);
    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }
    const todos = users[userIndex].todos || [];
    const newTodos = todos.filter(t => t.id !== id);
    users[userIndex].todos = newTodos;
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ success: true, message: 'Todo deleted' });
});
