var carrinho = carrinho || [];
let chatAtual = null;

// ================== DOM READY ==================
document.addEventListener('DOMContentLoaded', () => {
    // Categoria padrão do cardápio
    const categoriaDefault = document.getElementById('Bebidas quentes e batidas');
    if (categoriaDefault) showCategoria('Bebidas quentes e batidas');

    // ================== SIDEBAR ==================
    const sidebar = document.querySelector(".sidebar");
    const chatContainer = document.querySelector(".chat-container");
    const toggleBtn = document.getElementById("toggleSidebar");

    // Sidebar começa fechada
    sidebar.classList.remove("open");
    chatContainer.style.marginLeft = "0"; // força o chat ocupar toda a largura

    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        sidebar.classList.toggle("open");
        // Ajusta o chat
        chatContainer.style.marginLeft = sidebar.classList.contains("open") 
            ? sidebar.offsetWidth + "px" 
            : "0";
    });

    // Fecha sidebar clicando fora
    document.addEventListener("click", (e) => {
        if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
            sidebar.classList.remove("open");
            chatContainer.style.marginLeft = "0";
        }
    });

    // Carregar usuários online
    carregarUsuariosOnline();
    setInterval(carregarUsuariosOnline, 30000);

    // Atualizar mensagens a cada 5s
    setInterval(carregarMensagens, 10000);

    // Abre chat Social Chat por padrão
    abrirChat('social', 'Social Chat');
});

// ================== CARDÁPIO ==================
function showCategoria(categoria) {
    document.querySelectorAll('.categoria').forEach(div => div.style.display = 'none');
    const el = document.getElementById(categoria);
    if (el) el.style.display = 'block';
}

function adicionarAoCarrinho(id, preco, nome, categoria) {
    let sabor = '';
    if (categoria === 'PÃO COM CHURRAS') {
        const select = document.getElementById(`sabor-${nome}`);
        sabor = select ? select.value : '';
    }
    carrinho.push({ id, preco: parseFloat(preco), nome, sabor });
    atualizarCarrinho();
    abrirCarrinhoPopup();
}

function atualizarCarrinho() {
    const total = carrinho.reduce((soma, item) => soma + item.preco, 0);
    const info = document.getElementById('carrinho-info');
    if (info) info.textContent = `Itens: ${carrinho.length} | Total: R$ ${total.toFixed(2)}`;

    const itensDiv = document.getElementById('carrinhoItens');
    if (itensDiv) {
        itensDiv.innerHTML = carrinho.map(item => `
            <div style="display:flex; justify-content:space-between; margin:5px 0;">
                <span>${item.nome} (${item.sabor || 'Sem sabor'}) - R$ ${item.preco.toFixed(2)}</span>
                <button onclick="removerDoCarrinho('${item.id}')" style="color:#8B0000; background:none; border:none; cursor:pointer;">X</button>
            </div>
        `).join('');
    }
}

function removerDoCarrinho(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    atualizarCarrinho();
}

function abrirCarrinhoPopup() {
    const popup = document.getElementById('carrinhoPopup');
    if (popup) {
        popup.style.display = 'flex';
        atualizarCarrinho();
    }
}

function fecharCarrinhoPopup() {
    const popup = document.getElementById('carrinhoPopup');
    if (popup) popup.style.display = 'none';
}

function abrirModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'flex';
}

function fecharModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
}

async function enviarPedido() {
    const mesa = document.getElementById('mesa').value.trim();
    const contato = document.getElementById('contato').value.trim();
    const obs = document.getElementById('obs').value || '';

    if (carrinho.length === 0) { alert("Adicione itens ao pedido antes de finalizar!"); return; }
    if (!mesa || !contato) { alert("Mesa e contato são obrigatórios!"); return; }

    const total = carrinho.reduce((sum, item) => sum + item.preco, 0);
    const pedido = {
        mesa, contato, observacoes: obs,
        produto: carrinho.map(item => ({ id: item.id, quantidade: 1, observacao: obs, sabor: item.sabor })),
        total
    };

    try {
        const botao = document.querySelector('#modal button[onclick="enviarPedido()"]');
        if (botao) botao.innerHTML = '<div class="spinner"></div> Enviando...';

        const response = await fetch('/enviar_pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Erro ${response.status}: ${text}`);
        }

        const data = await response.json();
        alert(data.message);
        carrinho = [];
        atualizarCarrinho();
        fecharModal();
        window.location.href = '/pedidos/meuspedidos';
    } catch (error) {
        alert('Erro ao processar o pedido: ' + error.message);
        console.error('Erro:', error);
    } finally {
        const botao = document.querySelector('#modal button[onclick="enviarPedido()"]');
        if (botao) botao.innerHTML = 'Enviar Pedido';
    }
}

// ================== CHAT ==================
function minutosPassados(ts) {
    return Math.floor((Date.now() - new Date(ts)) / 60000);
}

async function carregarMensagens() {
    if (!chatAtual) return;
    try {
        const res = await fetch(`/api/mensagens?chat_id=${chatAtual}`);
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        const msgs = await res.json();
        const container = document.getElementById("messages");
        if (!container) return;
        container.innerHTML = "";

        msgs.forEach(m => {
            const div = document.createElement("div");
            div.className = "message " + (m.id_cliente === meuId ? "self outgoing_msg" : "incoming_msg");
            div.innerHTML = `
                <div class="${m.id_cliente === meuId ? 'sent_msg' : 'received_withd_msg'}">
                    <p><strong>${m.nome}</strong><br>${m.mensagem}</p>
                    <span class="time_date">${minutosPassados(m.created_at)} min</span>
                </div>
            `;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
    }
}

async function enviarMensagem() {
    const msgInput = document.getElementById("msgInput");
    if (!msgInput) return;
    const msg = msgInput.value.trim();
    if (!msg) return;

    await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatAtual,
            id_cliente: meuId,
            nome: meuNome,
            mesa: minhaMesa,
            mensagem: msg
        })
    });

    msgInput.value = "";
}

function abrirChat(chatId, nomeContato = null) {
    chatAtual = chatId;
    const container = document.getElementById("messages");
    if (container) container.innerHTML = "";

    const chatTitle = document.getElementById("chatTitle");
    if (chatTitle) {
        if (nomeContato) chatTitle.textContent = nomeContato;
        else if (chatId === "social") chatTitle.textContent = "Social Chat";
        else if (chatId === "lele") chatTitle.textContent = "Atendimento Lele";
        else chatTitle.textContent = "Chat";
    }

    carregarMensagens();

    // Fecha a sidebar quando abre um chat
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("open");
}

function abrirChatPrivado(outroId, nomeContato) {
    const idsOrdenados = [meuId, outroId].sort();
    const chatId = `privado_${idsOrdenados[0]}_${idsOrdenados[1]}`;
    abrirChat(chatId, nomeContato);
}

async function carregarUsuariosOnline() {
    try {
        const res = await fetch("/api/usuarios_online");
        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        const usuarios = await res.json();

        const container = document.getElementById("clientesOnline");
        if (!container) return;
        container.innerHTML = "";

        // Chats fixos
        const fixedChats = [
            {id: "social", nome: "💬 Social Chat"},
            {id: "lele", nome: "📞 Atendimento Lele"}
        ];
        fixedChats.forEach(c => {
            const div = document.createElement("div");
            div.className = "chat-item active-fixed";
            div.textContent = c.nome;
            div.onclick = () => abrirChat(c.id, c.nome);
            container.appendChild(div);
        });

        // Clientes online
        usuarios.forEach(u => {
            const div = document.createElement("div");
            div.className = "chat-item";
            div.textContent = `${u.nome} - Mesa ${u.mesa}`;
            div.onclick = () => abrirChatPrivado(u.id_cliente, u.nome);
            container.appendChild(div);
        });

    } catch (err) {
        console.error("Erro ao carregar usuários online:", err);
    }
}
