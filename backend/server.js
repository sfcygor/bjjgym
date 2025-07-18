// backend/server.js (VERSÃO FINAL GARANTIDA)

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3002; // A porta para o backend

// --- Middlewares ---
app.use(cors()); // Permite que o frontend acesse o backend
app.use(express.json()); // Permite que o servidor entenda JSON nas requisições

// --- Conexão com o Banco de Dados ---
// Isso vai criar um arquivo chamado 'academia.db' na sua pasta backend
const db = new sqlite3.Database('./academia.db', (err) => {
    if (err) return console.error("Erro ao conectar ao banco:", err.message);
    console.log('Conectado ao banco de dados SQLite.');
});

// --- Criação das Tabelas ---
db.serialize(() => {
    // Tabela de Alunos
    db.run(`CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL, tipo TEXT, peso REAL, altura REAL, faixa TEXT,
        idade INTEGER, telefone TEXT, turma TEXT, dataCadastro TEXT,
        proximoVencimento TEXT, ativo BOOLEAN, responsavelNome TEXT, responsavelTelefone TEXT
    )`);
    // Tabela de Pagamentos
    db.run(`CREATE TABLE IF NOT EXISTS pagamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alunoId INTEGER,
        alunoNome TEXT,
        valor REAL,
        data TEXT
    )`);
    // Tabela de Configurações
    db.run(`CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT
    )`, (err) => {
        if (!err) {
            // Insere um valor padrão para a mensalidade se não existir
            db.run(`INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)`, ['valorMensalidade', '150']);
        }
    });
    console.log("Tabelas verificadas/criadas com sucesso.");
});


// ==========================================================
// --- ROTAS DA API ---
// ==========================================================

// --- ROTAS DE ALUNOS (CRUD) ---
app.get('/api/alunos', (req, res) => {
    db.all("SELECT * FROM alunos ORDER BY nome", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/alunos', (req, res) => {
    const d = req.body;
    const sql = `INSERT INTO alunos (nome, tipo, peso, altura, faixa, idade, telefone, turma, dataCadastro, proximoVencimento, ativo, responsavelNome, responsavelTelefone) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [d.nome, d.tipo, d.peso, d.altura, d.faixa, d.idade, d.telefone, d.turma, d.dataCadastro, d.proximoVencimento, true, d.responsavelNome, d.responsavelTelefone];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/alunos/:id', (req, res) => {
    const { id } = req.params;
    const d = req.body;
    const sql = `UPDATE alunos SET nome=?, tipo=?, peso=?, altura=?, faixa=?, idade=?, telefone=?, turma=?, proximoVencimento=?, ativo=?, responsavelNome=?, responsavelTelefone=? WHERE id=?`;
    const params = [d.nome, d.tipo, d.peso, d.altura, d.faixa, d.idade, d.telefone, d.turma, d.proximoVencimento, d.ativo, d.responsavelNome, d.responsavelTelefone, id];
    db.run(sql, params, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Aluno atualizado", changes: this.changes });
    });
});

app.delete('/api/alunos/:id', (req, res) => {
    db.run('DELETE FROM alunos WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        db.run('DELETE FROM pagamentos WHERE alunoId = ?', req.params.id);
        res.json({ message: "Aluno removido", changes: this.changes });
    });
});


// --- ROTAS DE PAGAMENTOS ---
app.get('/api/pagamentos', (req, res) => {
    db.all("SELECT * FROM pagamentos ORDER BY data DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/pagamentos', (req, res) => {
    const { alunoId, alunoNome, valor, data } = req.body;
    const sql = `INSERT INTO pagamentos (alunoId, alunoNome, valor, data) VALUES (?,?,?,?)`;
    db.run(sql, [alunoId, alunoNome, valor, data], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});


// --- ROTAS DE CONFIGURAÇÕES ---
app.get('/api/config', (req, res) => {
    db.all("SELECT * FROM config", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const configObject = rows.reduce((acc, row) => {
            try {
                acc[row.chave] = JSON.parse(row.valor);
            } catch (e) {
                acc[row.chave] = row.valor;
            }
            return acc;
        }, {});
        res.json(configObject);
    });
});

app.put('/api/config', (req, res) => {
    const { chave, valor } = req.body;
    const sql = `UPDATE config SET valor = ? WHERE chave = ?`;
    db.run(sql, [JSON.stringify(valor), chave], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "Configuração atualizada" });
    });
});


// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
});