// academia_final/server.js (VERSÃO FINAL PARA RENDER COM POSTGRESQL)

const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Usando a nova ferramenta para o PostgreSQL

const app = express();
// O Render define a porta automaticamente, mas usamos 3002 para o teste local
const PORT = process.env.PORT || 3002;

// --- Conexão com o Banco de Dados PostgreSQL ---
// Esta configuração busca a URL secreta que vamos colocar no Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // A linha abaixo é necessária para a conexão em ambientes como o Render
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Middlewares ---
app.use(express.json()); // Para entender JSON
app.use(express.static(path.join(__dirname, 'public'))); // Para servir o frontend

// --- Função para Criar as Tabelas ---
const createTables = async () => {
    // Note a pequena mudança no SQL: "SERIAL PRIMARY KEY" é o auto-incremento do PostgreSQL
    const queryText = `
    CREATE TABLE IF NOT EXISTS alunos (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL, tipo TEXT, peso REAL, altura REAL, faixa TEXT,
        idade INTEGER, telefone TEXT, turma TEXT, dataCadastro TEXT,
        proximoVencimento TEXT, ativo BOOLEAN, responsavelNome TEXT, responsavelTelefone TEXT
    );
    CREATE TABLE IF NOT EXISTS pagamentos (
        id SERIAL PRIMARY KEY,
        alunoId INTEGER,
        alunoNome TEXT,
        valor REAL,
        data TEXT
    );
    CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT
    );
    -- "ON CONFLICT DO NOTHING" evita erros se a chave já existir
    INSERT INTO config (chave, valor) VALUES ('valorMensalidade', '150') ON CONFLICT (chave) DO NOTHING;
    `;
    try {
        await pool.query(queryText);
        console.log("Tabelas do PostgreSQL verificadas/criadas com sucesso.");
    } catch (err) {
        console.error("Erro ao criar tabelas no PostgreSQL", err);
    }
};

// =============================================
// --- ROTAS DA API (traduzidas para 'pg') ---
// =============================================
app.get('/api/alunos', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM alunos ORDER BY nome');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/alunos', async (req, res) => {
    const d = req.body;
    // No PostgreSQL, usamos $1, $2, etc. em vez de '?'
    const sql = `INSERT INTO alunos (nome, tipo, peso, altura, faixa, idade, telefone, turma, dataCadastro, proximoVencimento, ativo, responsavelNome, responsavelTelefone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`;
    const params = [d.nome, d.tipo, d.peso, d.altura, d.faixa, d.idade, d.telefone, d.turma, d.dataCadastro, d.proximoVencimento, true, d.responsavelNome, d.responsavelTelefone];
    try {
        const result = await pool.query(sql, params);
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/alunos/:id', async (req, res) => {
    const d = req.body;
    const sql = `UPDATE alunos SET nome=$1, tipo=$2, peso=$3, altura=$4, faixa=$5, idade=$6, telefone=$7, turma=$8, proximoVencimento=$9, ativo=$10, responsavelNome=$11, responsavelTelefone=$12 WHERE id=$13`;
    const params = [d.nome, d.tipo, d.peso, d.altura, d.faixa, d.idade, d.telefone, d.turma, d.proximoVencimento, d.ativo, d.responsavelNome, d.responsavelTelefone, req.params.id];
    try {
        await pool.query(sql, params);
        res.json({ message: "Aluno atualizado" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/alunos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM pagamentos WHERE alunoId = $1', [req.params.id]);
        await pool.query('DELETE FROM alunos WHERE id = $1', [req.params.id]);
        res.json({ message: "Aluno removido" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/pagamentos', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM pagamentos ORDER BY data DESC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pagamentos', async (req, res) => {
    const { alunoId, alunoNome, valor, data } = req.body;
    try {
        const result = await pool.query(`INSERT INTO pagamentos (alunoId, alunoNome, valor, data) VALUES ($1,$2,$3,$4) RETURNING id`, [alunoId, alunoNome, valor, data]);
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/config', async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM config");
        const configObject = rows.reduce((acc, row) => { try { acc[row.chave] = JSON.parse(row.valor); } catch (e) { acc[row.chave] = row.valor; } return acc; }, {});
        res.json(configObject);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/config', async (req, res) => {
    const { chave, valor } = req.body;
    try {
        await pool.query(`UPDATE config SET valor = $1 WHERE chave = $2`, [JSON.stringify(valor), chave]);
        res.json({ message: "Configuração atualizada" });
    } catch (err) { res.status(400).json({ error: err.message }); }
});


// --- Iniciar o Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor completo rodando na porta ${PORT}`);
    // Chama a função para garantir que as tabelas existam
    createTables();
});