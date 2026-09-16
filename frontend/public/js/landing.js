// frontend/public/js/landing.js

/**
 * Configuração Firebase e Lógica da Landing Page do A7SYSTEM.
 * Este script utiliza o Firebase v9 Compat para facilitar a integração vanilla.
 */

// Se o Firebase ainda não foi inicializado globalmente por outro script, configure-o aqui.
// (Geralmente num ambiente real os dados estariam em config separado, mas por robustez inicializamos se necessário)
const firebaseConfig = {
    // Substituir pelas chaves reais de prod
    apiKey: "SUA_API_KEY",
    authDomain: "a7system-prod.firebaseapp.com",
    projectId: "a7system-prod",
    storageBucket: "a7system-prod.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Variáveis Globais de Estado
let empresasData = [];
let allProdutos = [];
let displayedProdutos = [];
const PAGE_SIZE = 12;
let currentOffset = 0;

// Elementos da UI
const els = {
    empresasGrid: document.getElementById('empresasGrid'),
    produtosGrid: document.getElementById('produtosGrid'),
    empresaFilter: document.getElementById('empresaFilter'),
    priceFilter: document.getElementById('priceFilter'),
    searchInput: document.getElementById('searchInput'),
    btnSearch: document.getElementById('btnSearch'),
    btnLoadMore: document.getElementById('btnLoadMore'),
    
    // Modal
    modal: document.getElementById('productModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    modalMainImage: document.getElementById('modalMainImage'),
    modalEmpresa: document.getElementById('modalEmpresa'),
    modalName: document.getElementById('modalName'),
    modalCode: document.getElementById('modalCode'),
    modalDesc: document.getElementById('modalDesc'),
    modalPrice: document.getElementById('modalPrice'),
    modalStatus: document.getElementById('modalStatus'),
    btnContactWpp: document.getElementById('btnContactWpp')
};

/**
 * Inicialização
 */
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Skeleton loading
    renderSkeletons();

    try {
        await loadEmpresas();
        await loadProdutos();
        setupEventListeners();
    } catch (error) {
        console.error("Erro ao carregar dados da landing page:", error);
        els.produtosGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--color-primary);">Erro ao carregar o catálogo. Tente novamente mais tarde.</p>`;
        els.empresasGrid.innerHTML = '';
    }
});

/**
 * Renderiza skeletons durante o carregamento
 */
function renderSkeletons() {
    let skeletons = '';
    for(let i=0; i<4; i++) {
        skeletons += `<div class="skeleton skeleton-card"></div>`;
    }
    els.empresasGrid.innerHTML = skeletons;
    els.produtosGrid.innerHTML = skeletons;
}

/**
 * Carrega empresas visíveis
 */
async function loadEmpresas() {
    const snap = await db.collection('empresas')
        .where('ativa', '==', true)
        .where('visivelNaLanding', '==', true)
        .get();

    empresasData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Preenche Grid de Empresas
    if (empresasData.length === 0) {
        els.empresasGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhuma empresa parceira disponível no momento.</p>';
    } else {
        els.empresasGrid.innerHTML = empresasData.map(emp => `
            <div class="empresa-card" onclick="filterByEmpresa('${emp.id}')">
                <h3>${emp.nomeFantasia || emp.razaoSocial}</h3>
                <p>${emp.descricao || 'Conheça nossos produtos'}</p>
            </div>
        `).join('');
    }

    // Preenche Filtro Select
    empresasData.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.nomeFantasia || emp.razaoSocial;
        els.empresaFilter.appendChild(option);
    });
}

/**
 * Carrega produtos das empresas ativas (que têm qtd > 0 ou apenas ativas)
 */
async function loadProdutos() {
    if (empresasData.length === 0) {
        els.produtosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto disponível.</p>';
        return;
    }

    const empresasIds = empresasData.map(e => e.id);
    
    // Firestore limita 'in' a 10 valores. Se houver mais, seria necessário chunking,
    // mas para simplificar na versão inicial, fazemos até 10 ou buscamos todos e filtramos client-side.
    // Como é landing page, o ideal é ter uma collection separada ou backend para otimização se o volume for alto.
    // Vamos buscar produtos e filtrar no client-side para não bater no limite de 'in' do Firestore
    
    const snap = await db.collection('produtos')
        .where('ativo', '==', true)
        .get();

    allProdutos = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(prod => empresasIds.includes(prod.empresaId)); // Client-side filter

    applyFilters();
}

/**
 * Filtra produtos a partir da empresa clicada nos cards
 */
window.filterByEmpresa = function(empresaId) {
    els.empresaFilter.value = empresaId;
    applyFilters();
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
};

/**
 * Aplica os filtros (Pesquisa, Empresa, Preço)
 */
function applyFilters() {
    const searchVal = els.searchInput.value.toLowerCase();
    const empresaId = els.empresaFilter.value;
    const priceVal = els.priceFilter.value;

    displayedProdutos = allProdutos.filter(prod => {
        // Filtro de Texto
        const matchesSearch = (prod.nome && prod.nome.toLowerCase().includes(searchVal)) || 
                              (prod.codigo && prod.codigo.toLowerCase().includes(searchVal));
        if (!matchesSearch) return false;

        // Filtro de Empresa
        if (empresaId && prod.empresaId !== empresaId) return false;

        // Filtro de Preço
        if (priceVal && prod.precoVenda != null) {
            const p = parseFloat(prod.precoVenda);
            if (priceVal === '0-50' && p > 50) return false;
            if (priceVal === '50-100' && (p <= 50 || p > 100)) return false;
            if (priceVal === '100-500' && (p <= 100 || p > 500)) return false;
            if (priceVal === '500+' && p <= 500) return false;
        }

        return true;
    });

    currentOffset = 0;
    els.produtosGrid.innerHTML = '';
    renderProdutosPage();
}

/**
 * Renderiza página de produtos e controle do botão Carregar Mais
 */
function renderProdutosPage() {
    if (displayedProdutos.length === 0) {
        els.produtosGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhum produto encontrado com os filtros atuais.</p>';
        els.btnLoadMore.style.display = 'none';
        return;
    }

    const nextBatch = displayedProdutos.slice(currentOffset, currentOffset + PAGE_SIZE);
    
    const html = nextBatch.map(prod => {
        const empresa = empresasData.find(e => e.id === prod.empresaId);
        const empNome = empresa ? (empresa.nomeFantasia || empresa.razaoSocial) : 'Empresa Indefinida';
        const imgUrl = (prod.imagens && prod.imagens.length > 0) ? prod.imagens[0] : 'https://via.placeholder.com/300x200?text=Sem+Foto';
        const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.precoVenda || 0);
        const hasStock = (prod.quantidadeAtual || 0) > 0;
        
        return `
            <div class="produto-card">
                <img src="${imgUrl}" alt="${prod.nome}" class="produto-img" loading="lazy">
                <div class="produto-info">
                    <span class="produto-empresa">${empNome}</span>
                    <h3>${prod.nome}</h3>
                    <p style="font-size: 0.8rem; color: var(--color-text-light); margin-bottom: 0.5rem;">Cód: ${prod.codigo || 'N/A'}</p>
                    <span class="produto-preco">${precoFormatado}</span>
                    <div>
                        <span class="produto-status ${hasStock ? 'status-disponivel' : 'status-indisponivel'}">
                            ${hasStock ? 'Disponível' : 'Indisponível'}
                        </span>
                    </div>
                    <button class="btn-detalhes" onclick="openProductModal('${prod.id}')">Ver Detalhes</button>
                </div>
            </div>
        `;
    }).join('');

    els.produtosGrid.innerHTML += html;
    currentOffset += PAGE_SIZE;

    if (currentOffset >= displayedProdutos.length) {
        els.btnLoadMore.style.display = 'none';
    } else {
        els.btnLoadMore.style.display = 'inline-block';
    }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
    els.btnSearch.addEventListener('click', applyFilters);
    els.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') applyFilters();
    });
    
    els.empresaFilter.addEventListener('change', applyFilters);
    els.priceFilter.addEventListener('change', applyFilters);
    
    els.btnLoadMore.addEventListener('click', renderProdutosPage);
    
    // Modal fechar
    els.btnCloseModal.addEventListener('click', closeModal);
    els.modal.addEventListener('click', (e) => {
        if (e.target === els.modal) closeModal();
    });

    // Mobile Menu
    setupMobileMenu();
}

function setupMobileMenu() {
    const menuBtn = document.getElementById('landing-menu-btn');
    const closeBtn = document.getElementById('landing-menu-close');
    const nav = document.getElementById('landing-main-nav');
    const backdrop = document.getElementById('landing-nav-backdrop');

    function openMenu() {
        if (nav) nav.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        if (nav) nav.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (nav && nav.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);

    // Fechar menu ao clicar em links
    if (nav) {
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) closeMenu();
            });
        });
    }

    // Tecla Escape para fechar modal ou menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeMenu();
        }
    });
}

/**
 * Lógica do Modal
 */
window.openProductModal = function(produtoId) {
    const prod = allProdutos.find(p => p.id === produtoId);
    if (!prod) return;

    const empresa = empresasData.find(e => e.id === prod.empresaId);
    const empNome = empresa ? (empresa.nomeFantasia || empresa.razaoSocial) : 'Empresa Indefinida';
    const hasStock = (prod.quantidadeAtual || 0) > 0;
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.precoVenda || 0);

    els.modalEmpresa.textContent = empNome;
    els.modalName.textContent = prod.nome;
    els.modalCode.textContent = prod.codigo || 'N/A';
    els.modalDesc.textContent = prod.descricao || 'Sem descrição detalhada.';
    els.modalPrice.textContent = precoFormatado;
    
    els.modalStatus.textContent = hasStock ? 'Disponível' : 'Indisponível';
    els.modalStatus.className = `modal-status ${hasStock ? 'status-disponivel' : 'status-indisponivel'}`;

    // Imagem principal
    const imgUrl = (prod.imagens && prod.imagens.length > 0) ? prod.imagens[0] : 'https://via.placeholder.com/600x400?text=Sem+Foto';
    els.modalMainImage.innerHTML = `<img src="${imgUrl}" alt="${prod.nome}">`;

    // Botão WhatsApp
    if (empresa && empresa.telefone) {
        const textMsg = encodeURIComponent(`Olá! Vi o produto ${prod.nome} (Cód: ${prod.codigo || 'N/A'}) no catálogo digital e gostaria de mais informações.`);
        let fone = empresa.telefone.replace(/\D/g, ''); // limpa não números
        if (!fone.startsWith('55')) fone = '55' + fone;
        els.btnContactWpp.href = `https://wa.me/${fone}?text=${textMsg}`;
        els.btnContactWpp.style.display = 'inline-block';
    } else {
        els.btnContactWpp.style.display = 'none';
    }

    els.modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // impede scroll de fundo
};

window.closeModal = function() {
    els.modal.classList.remove('active');
    document.body.style.overflow = '';
};
