

// frontend/script.js (VERSÃO FINAL COM ATUALIZAÇÃO INTELIGENTE)

document.addEventListener('DOMContentLoaded', () => {

    if (sessionStorage.getItem('usuarioLogado') !== 'true') 
        // Se o usuário não estiver logado, chuta ele de volta para a página de login
        window.location.href = 'login.html';
    const API_URL = 'http://localhost:3002/api'; // Verifique se a porta está correta!

    // =================================================================
    // 1. ESTADO DA APLICAÇÃO (DADOS GLOBAIS)
    // =================================================================
    let alunos = [];
    let pagamentos = [];
    let config = { valorMensalidade: 150 }; // Valor padrão
    let faturamentoChartInstance = null;


    // =================================================================
    // 2. FUNÇÕES DE RENDERIZAÇÃO (DESENHAR NA TELA)
    // =================================================================
    const updateUI = () => {
        renderDashboard();
        renderAlunos();
        renderMensalidades();
        renderFinanceiro();
        renderConfiguracoes();
    };

    const renderDashboard = () => {
        const alunosAtivos = alunos.filter(a => a.ativo);
        document.getElementById('total-alunos-ativos').textContent = alunosAtivos.length;
        const statusGeral = alunosAtivos.map(getStatusMensalidade);
        document.getElementById('mensalidades-pendentes-semana').textContent = statusGeral.filter(s => s.classe === 'pendente').length;
        document.getElementById('alunos-em-dia').textContent = statusGeral.filter(s => s.classe === 'pago').length;

        const hoje = new Date();
        const pagamentosMesCorrente = pagamentos.filter(p => {
            const dataP = new Date(p.data);
            return dataP.getFullYear() === hoje.getFullYear() && dataP.getMonth() === hoje.getMonth();
        });
        const faturamentoMes = pagamentosMesCorrente.reduce((acc, p) => acc + p.valor, 0);
        document.getElementById('faturamento-mes-dashboard').textContent = formatCurrency(faturamentoMes);
    };

    const renderAlunos = () => {
        const filtroStatus = document.querySelector('#alunoStatusFilter .active').dataset.filter;
        const filtroNome = document.getElementById('searchInput').value.toLowerCase();
        const tableBody = document.getElementById('alunosTable').querySelector('tbody');
        tableBody.innerHTML = '';

        const alunosFiltrados = alunos.filter(aluno => {
            const nomeMatch = aluno.nome.toLowerCase().includes(filtroNome);
            if (!nomeMatch) return false;
            if (filtroStatus === 'todos') return true;
            return filtroStatus === 'ativos' ? aluno.ativo : !aluno.ativo;
        });

        alunosFiltrados.forEach(aluno => {
            const tr = document.createElement('tr');
            tr.className = aluno.ativo ? '' : 'aluno-inativo';
            tr.innerHTML = `
                <td><a href="#" class="profile-link" onclick="abrirPerfilEdicao(${aluno.id})">${aluno.nome}</a></td>
                <td>${aluno.faixa}</td>
                <td><span class="status ${aluno.ativo ? 'status-pago' : 'status-atrasado'}">${aluno.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td class="actions-cell">
                    <button class="action-btn edit" onclick="abrirPerfilEdicao(${aluno.id})" title="Editar"><i class="ri-pencil-line"></i></button>
                    <button class="action-btn toggle-active ${aluno.ativo ? 'active' : 'inactive'}" onclick="toggleAtivo(${aluno.id})" title="${aluno.ativo ? 'Inativar' : 'Ativar'}"><i class="ri-user-${aluno.ativo ? 'follow' : 'forbid'}-line"></i></button>
                    <button class="action-btn delete" onclick="removerAluno(${aluno.id})" title="Remover"><i class="ri-delete-bin-line"></i></button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    };

    const renderMensalidades = () => {
        const filtroStatus = document.querySelector('#mensalidadeStatusFilter .active').dataset.filter;
        const filtroNome = document.getElementById('searchInput').value.toLowerCase();
        const tableBody = document.getElementById('mensalidadesTable').querySelector('tbody');
        tableBody.innerHTML = '';
        const alunosAtivos = alunos.filter(a => a.ativo && a.nome.toLowerCase().includes(filtroNome));
        const mensalidadesFiltradas = alunosAtivos.map(aluno => ({ aluno, status: getStatusMensalidade(aluno) })).filter(({ status }) => filtroStatus === 'all' || status.classe === filtroStatus);
        
        mensalidadesFiltradas.forEach(({ aluno, status }) => {
            const tr = document.createElement('tr');
            const dataVencimento = new Date(aluno.proximoVencimento + 'T00:00:00').toLocaleDateString('pt-BR');
            tr.innerHTML = `
                <td>${aluno.nome}</td>
                <td>${dataVencimento}</td>
                <td><span class="status status-${status.classe}">${status.texto}</span></td>
                <td class="actions-cell">
                    ${status.classe !== 'pago' ? `<button class="btn btn-action" onclick="marcarComoPaga(${aluno.id})"><i class="ri-check-line"></i> Marcar Paga</button>` : 'Pago'}
                    ${status.classe === 'atrasado' ? `<a href="https://wa.me/${aluno.telefone}?text=Olá ${aluno.nome.split(' ')[0]}, tudo bem? Sua mensalidade do Jiu-Jitsu está em atraso." target="_blank" class="btn btn-whatsapp"><i class="ri-whatsapp-line"></i> Cobrar</a>` : ''}
                </td>`;
            tableBody.appendChild(tr);
        });
    };

    const renderFinanceiro = () => {
        const ano = document.getElementById('financeiroAnoFiltro').value;
        const mes = document.getElementById('financeiroMesFiltro').value;
        const pagamentosNoAno = pagamentos.filter(p => new Date(p.data).getFullYear() == ano);
        const pagamentosNoMes = (mes === 'todos') ? pagamentosNoAno : pagamentosNoAno.filter(p => new Date(p.data).getMonth() == mes);
        
        document.getElementById('faturamentoBrutoAno').textContent = formatCurrency(pagamentosNoAno.reduce((acc, p) => acc + p.valor, 0));
        document.getElementById('faturamentoBrutoMes').textContent = formatCurrency(pagamentosNoMes.reduce((acc, p) => acc + p.valor, 0));

        const lancamentosBody = document.getElementById('lancamentosTable').querySelector('tbody');
        lancamentosBody.innerHTML = '';
        pagamentosNoMes.forEach(p => {
            lancamentosBody.innerHTML += `<tr><td>${new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td>${p.alunoNome}</td><td>${formatCurrency(p.valor)}</td></tr>`;
        });
        renderGrafico(pagamentosNoAno);
    };

    const renderGrafico = (pagamentosDoAno) => {
        const ctx = document.getElementById('faturamentoChart').getContext('2d');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const data = Array(12).fill(0);
        pagamentosDoAno.forEach(p => data[new Date(p.data).getMonth()] += p.valor);
        if (faturamentoChartInstance) faturamentoChartInstance.destroy();
        faturamentoChartInstance = new Chart(ctx, {
            type: 'bar', data: { labels: meses, datasets: [{ label: 'Faturamento Bruto', data: data, backgroundColor: 'rgba(0, 170, 255, 0.5)', borderColor: 'rgba(0, 170, 255, 1)', borderWidth: 1, borderRadius: 5 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#e0e5f0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }, x: { ticks: { color: '#e0e5f0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } } }, plugins: { legend: { labels: { color: '#e0e5f0' } } } }
        });
    };
    
    const renderConfiguracoes = () => {
        document.getElementById('valorMensalidade').value = config.valorMensalidade.toFixed(2);
    };


    // =================================================================
    // 3. LÓGICA DE NEGÓCIO E AÇÕES (CONVERSA COM O BACKEND)
    // =================================================================
    async function carregarDadosIniciais() {
        try {
            const [alunosRes, pagamentosRes, configRes] = await Promise.all([
                fetch(`${API_URL}/alunos`),
                fetch(`${API_URL}/pagamentos`),
                fetch(`${API_URL}/config`)
            ]);
            alunos = await alunosRes.json();
            pagamentos = await pagamentosRes.json();
            config = await configRes.json();
            updateUI();
        } catch (error) {
            console.error('Erro fatal ao carregar dados do servidor:', error);
            alert('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
        }
    }
    
    window.removerAluno = async (id) => {
        if (confirm('Tem certeza que deseja remover este aluno?')) {
            const response = await fetch(`${API_URL}/alunos/${id}`, { method: 'DELETE' });
            if (response.ok) {
                // ATUALIZAÇÃO INTELIGENTE: Remove o aluno da lista local
                alunos = alunos.filter(a => a.id !== id);
                pagamentos = pagamentos.filter(p => p.alunoId !== id);
                updateUI(); // Apenas redesenha a tela, sem recarregar tudo
            } else {
                alert('Falha ao remover o aluno.');
            }
        }
    };
    
    window.toggleAtivo = async (id) => {
        const aluno = alunos.find(a => a.id === id);
        if (!aluno) return;
        aluno.ativo = !aluno.ativo; // Muda o status localmente primeiro
        const response = await fetch(`${API_URL}/alunos/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aluno)
        });
        if (response.ok) {
            // ATUALIZAÇÃO INTELIGENTE: Apenas redesenha a tela
            updateUI();
        } else {
            aluno.ativo = !aluno.ativo; // Reverte a mudança se a API falhar
            alert('Falha ao atualizar o status.');
        }
    };

    window.marcarComoPaga = async (id) => {
        const aluno = alunos.find(a => a.id === id);
        if (!aluno) return;

        // 1. Prepara os novos dados
        const novoPagamento = { alunoId: aluno.id, alunoNome: aluno.nome, valor: config.valorMensalidade, data: new Date().toISOString().split('T')[0] };
        const proximoVencimentoAntigo = aluno.proximoVencimento;
        aluno.proximoVencimento = addDays(aluno.proximoVencimento, 30);

        // 2. Envia para o backend
        const [pagamentoRes, alunoRes] = await Promise.all([
            fetch(`${API_URL}/pagamentos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoPagamento)
            }),
            fetch(`${API_URL}/alunos/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aluno)
            })
        ]);
        
        // 3. Se tudo deu certo, atualiza a tela
        if (pagamentoRes.ok && alunoRes.ok) {
            const pagamentoSalvo = await pagamentoRes.json();
            pagamentos.push({ ...novoPagamento, id: pagamentoSalvo.id }); // Adiciona o novo pagamento na lista local
            updateUI(); // Redesenha
        } else {
            aluno.proximoVencimento = proximoVencimentoAntigo; // Reverte se falhar
            alert('Falha ao registrar pagamento.');
        }
    };
    
    window.abrirPerfilEdicao = (alunoId) => {
        const aluno = alunos.find(a => a.id === alunoId);
        if (!aluno) return;
        const modal = document.getElementById('editModal');
        const form = document.getElementById('editAlunoForm');
        form.querySelector('#editAlunoId').value = aluno.id;
        form.querySelector('#editNome').value = aluno.nome;
        form.querySelector('#editTipo').value = aluno.tipo;
        form.querySelector('#editPeso').value = aluno.peso;
        form.querySelector('#editAltura').value = aluno.altura;
        form.querySelector('#editFaixa').value = aluno.faixa;
        form.querySelector('#editIdade').value = aluno.idade;
        form.querySelector('#editTelefone').value = aluno.telefone;
        form.querySelector('#editTurma').value = aluno.turma;
        
        const respFields = form.querySelector('#editResponsavelFields');
        respFields.classList.toggle('hidden', aluno.tipo !== 'Kid');
        if (aluno.tipo === 'Kid') {
            form.querySelector('#editResponsavelNome').value = aluno.responsavelNome || '';
            form.querySelector('#editResponsavelTelefone').value = aluno.responsavelTelefone || '';
        }
        modal.style.display = 'block';
    };


    // =================================================================
    // 4. INICIALIZAÇÃO E EVENT LISTENERS
    // =================================================================
    function init() {
        // Navegação
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const targetId = e.currentTarget.getAttribute('href');
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                document.querySelector(targetId).classList.add('active');
            });
        });
        
        // Modais
        const cadastroModal = document.getElementById('cadastroModal');
        const editModal = document.getElementById('editModal');
        document.getElementById('openCadastroModalBtn').addEventListener('click', () => {
            document.getElementById('alunoForm').reset();
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');
            document.getElementById('dataCadastro').value = `${ano}-${mes}-${dia}`;
            cadastroModal.style.display = 'block';
        });
        document.querySelectorAll('.modal .close-btn').forEach(btn => {
            btn.onclick = () => btn.closest('.modal').style.display = 'none';
        });
        window.onclick = e => {
            if (e.target.classList.contains('modal')) e.target.style.display = 'none';
        };

        // Formulário de Cadastro
        document.getElementById('alunoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const dataCadastro = form.querySelector('#dataCadastro').value;
            const novoAluno = {
                nome: form.querySelector('#nome').value, tipo: form.querySelector('#tipo').value,
                peso: parseFloat(form.querySelector('#peso').value), altura: parseFloat(form.querySelector('#altura').value),
                faixa: form.querySelector('#faixa').value, idade: parseInt(form.querySelector('#idade').value),
                telefone: form.querySelector('#telefone').value, turma: form.querySelector('#turma').value,
                dataCadastro: dataCadastro, proximoVencimento: addDays(dataCadastro, 30),
                responsavelNome: form.querySelector('#responsavelNome').value || null,
                responsavelTelefone: form.querySelector('#responsavelTelefone').value || null
            };
            const response = await fetch(`${API_URL}/alunos`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoAluno)
            });
            if (response.ok) {
                const alunoSalvo = await response.json();
                alunos.push({ ...novoAluno, id: alunoSalvo.id, ativo: true }); // Adiciona na lista local
                updateUI(); // Redesenha
            }
            cadastroModal.style.display = 'none';
        });

        // Formulário de Edição
        document.getElementById('editAlunoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = parseInt(form.querySelector('#editAlunoId').value);
            const index = alunos.findIndex(a => a.id === id);
            if (index === -1) return;

            const tipo = form.querySelector('#editTipo').value;
            const alunoAtualizado = {
                ...alunos[index], // Mantém dados que não são editados
                nome: form.querySelector('#editNome').value, tipo,
                peso: parseFloat(form.querySelector('#editPeso').value), altura: parseFloat(form.querySelector('#editAltura').value),
                faixa: form.querySelector('#editFaixa').value, idade: parseInt(form.querySelector('#editIdade').value),
                telefone: form.querySelector('#editTelefone').value, turma: form.querySelector('#editTurma').value,
                responsavelNome: tipo === 'Kid' ? form.querySelector('#editResponsavelNome').value : null,
                responsavelTelefone: tipo === 'Kid' ? form.querySelector('#editResponsavelTelefone').value : null
            };
            const response = await fetch(`${API_URL}/alunos/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alunoAtualizado)
            });
            if (response.ok) {
                alunos[index] = alunoAtualizado; // Atualiza na lista local
                updateUI();
            }
            editModal.style.display = 'none';
        });

        // Filtros e Busca
        document.getElementById('alunoStatusFilter').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('#alunoStatusFilter button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderAlunos();
            }
        });
        document.getElementById('mensalidadeStatusFilter').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON') {
                document.querySelectorAll('#mensalidadeStatusFilter button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderMensalidades();
            }
        });
        document.getElementById('searchInput').addEventListener('keyup', updateUI);

        // Configurações e Financeiro
        document.getElementById('salvarConfigBtn').addEventListener('click', async () => {
            const novoValor = parseFloat(document.getElementById('valorMensalidade').value);
            const response = await fetch(`${API_URL}/config`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chave: 'valorMensalidade', valor: novoValor })
            });
            if (response.ok) {
                config.valorMensalidade = novoValor;
                alert('Configuração salva!');
                updateUI();
            }
        });
        document.getElementById('financeiroAnoFiltro').addEventListener('change', renderFinanceiro);
        document.getElementById('financeiroMesFiltro').addEventListener('change', renderFinanceiro);

        // Preenche os filtros de data
        const anoFiltro = document.getElementById('financeiroAnoFiltro');
        const mesFiltro = document.getElementById('financeiroMesFiltro');
        const anoAtual = new Date().getFullYear();
        for (let i = anoAtual; i >= anoAtual - 5; i--) {
            anoFiltro.innerHTML += `<option value="${i}">${i}</option>`;
        }
        const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        mesFiltro.innerHTML = '<option value="todos">Todos os Meses</option>' + meses.map((m, i) => `<option value="${i}">${m}</option>`).join('');

        // Carrega os dados iniciais do servidor
        carregarDadosIniciais();
    }

    // Funções utilitárias que podem ser necessárias
    const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const addDays = (dateString, days) => {
        const date = new Date(dateString + 'T00:00:00'); date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    };
    const getStatusMensalidade = (aluno) => {
        if (!aluno.ativo) return { texto: 'Inativo', classe: 'inativo' };
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const vencimento = new Date(aluno.proximoVencimento + 'T00:00:00');
        const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { texto: 'Atrasado', classe: 'atrasado' };
        if (diffDays <= 7) return { texto: 'Vence na Semana', classe: 'pendente' };
        return { texto: 'Em Dia', classe: 'pago' };
    };

    init(); // Inicia a aplicação
});