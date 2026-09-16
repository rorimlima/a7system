/**
 * A7SYSTEM - Landing Page Scripts
 * Lógica para o catálogo público de produtos.
 */

// NOTA: Certifique-se de substituir o firebaseConfig pelos dados reais do projeto se não usar hosting do Firebase automático.
// Usaremos as variáveis globais injetadas, ou faremos init se houver.
const firebaseConfig = {
    // Configurações do Firebase. Idealmente, injetadas pelo ambiente.
    // Como é um catálogo público, chaves públicas são seguras aqui, 
    // desde que regras de Firestore estejam protegendo dados sensíveis.
    // EXCLUA ou SUBSTITUA com sua config real se necessário localmente.
};

// Inicialização do Firebase (caso não tenha sido inicializado)
if (!firebase.apps.length && Object.keys(firebaseConfig).length > 0) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Estado Global
let currentProducts = [];
let lastDoc = null;
const ITEMS_PER_PAGE = 12;
let isLoading = false;
let currentFilters = {
    companyId: '',
    search: '',
    sort: 'name'
};
let companiesMap = {};

// Elementos DOM
const elements = {
    productsGrid: document.getElementById('products-grid'),
    companySelect: document.getElementById('company-select'),
    sortSelect: document.getElementById('sort-select'),
    searchInput: document.getElementById('search-input'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    loadingSpinner: document.getElementById('loading-landing'),
    emptyState: document.getElementById('empty-state-landing'),
    modal: document.getElementById('product-modal'),
    closeModal: document.getElementById('close-modal'),
    modalOverlay: document.querySelector('.modal-overlay'),
    currentYear: document.getElementById('current-year')
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    elements.currentYear.textContent = new Date().getFullYear();
    setupEventListeners();
    await loadVisibleCompanies();
    await fetchProducts(true);
});

/**
 * Configura os listeners de eventos.
 */
function setupEventListeners() {
    let debounceTimer;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentFilters.search = e.target.value.trim().toLowerCase();
            fetchProducts(true);
        }, 300);
    });

    elements.companySelect.addEventListener('change', (e) => {
        currentFilters.companyId = e.target.value;
        fetchProducts(true);
    });

    elements.sortSelect.addEventListener('change', (e) => {
        currentFilters.sort = e.target.value;
        // Ordenação client-side ou recarregar
        sortAndRenderCurrent();
    });

    elements.loadMoreBtn.addEventListener('click', () => {
        fetchProducts(false);
    });

    elements.closeModal.addEventListener('click', closeProductModal);
    elements.modalOverlay.addEventListener('click', closeProductModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
            closeProductModal();
        }
    });
}

/**
 * Carrega as empresas visíveis na landing page e popula o select.
 */
async function loadVisibleCompanies() {
    try {
        // Query de empresas ativas e visíveis na landing page
        const snap = await db.collection('empresas')
            .where('ativa', '==', true)
            .where('visivelNaLanding', '==', true)
            .get();

        const select = elements.companySelect;
        
        snap.forEach(doc => {
            const data = doc.data();
            companiesMap[doc.id] = data.nomeFantasia || data.razaoSocial;
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = companiesMap[doc.id];
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar empresas:", error);
    }
}

/**
 * Busca produtos do Firestore baseados nos filtros.
 * @param {boolean} reset - Se true, limpa o grid e recomeça a paginação.
 */
async function fetchProducts(reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        elements.productsGrid.innerHTML = '';
        currentProducts = [];
        lastDoc = null;
        elements.loadMoreBtn.classList.add('hidden');
        showLoading(true);
        showEmptyState(false);
    }

    try {
        let query = db.collection('produtos')
            .where('quantidadeAtual', '>', 0);
            
        if (currentFilters.companyId) {
            query = query.where('empresaId', '==', currentFilters.companyId);
        }

        // Observação: Filtros complexos (busca textual + ordenação em campos diferentes)
        // podem requerer índices compostos no Firestore.
        // Faremos a filtragem por busca text (search) em client-side após a query,
        // limitando o fetch por página se não houver busca textual intensa,
        // ou você pode implementar algolia/typesense se for grande escala.
        
        query = query.limit(ITEMS_PER_PAGE);

        if (lastDoc && !reset) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        
        if (!snapshot.empty) {
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            const newProducts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filtro de busca textual client-side simples
            let filteredProducts = newProducts;
            if (currentFilters.search) {
                const s = currentFilters.search;
                filteredProducts = filteredProducts.filter(p => 
                    p.nome?.toLowerCase().includes(s) || 
                    p.descricao?.toLowerCase().includes(s)
                );
            }

            currentProducts = reset ? filteredProducts : [...currentProducts, ...filteredProducts];
            
            sortAndRenderCurrent();

            if (snapshot.docs.length === ITEMS_PER_PAGE) {
                elements.loadMoreBtn.classList.remove('hidden');
            } else {
                elements.loadMoreBtn.classList.add('hidden');
            }
        } else if (reset) {
            showEmptyState(true);
        }

    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        // Fallback gracefully
        if (reset) showEmptyState(true);
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

/**
 * Ordena a lista atual e re-renderiza o grid.
 */
function sortAndRenderCurrent() {
    const sortVal = currentFilters.sort;
    let sorted = [...currentProducts];

    sorted.sort((a, b) => {
        if (sortVal === 'name') return (a.nome || '').localeCompare(b.nome || '');
        if (sortVal === 'price_asc') return (a.precoVenda || 0) - (b.precoVenda || 0);
        if (sortVal === 'price_desc') return (b.precoVenda || 0) - (a.precoVenda || 0);
        if (sortVal === 'recent') return (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0);
        return 0;
    });

    renderProductsGrid(sorted);
}

/**
 * Renderiza os cards de produtos no grid.
 * @param {Array} products 
 */
function renderProductsGrid(products) {
    elements.productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        showEmptyState(true);
        return;
    }
    
    showEmptyState(false);
    
    products.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => openProductModal(prod);
        
        const imgUrl = getProductImageUrl(prod.fotoUrl);
        const companyName = companiesMap[prod.empresaId] || 'Parceiro A7SYSTEM';
        const price = formatPrice(prod.precoVenda || 0);
        
        card.innerHTML = `
            <img src="${imgUrl}" alt="${prod.nome || 'Produto'}" class="card-image" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Sem+Imagem'">
            <div class="card-content">
                <span class="badge">${companyName}</span>
                <h3 class="card-title">${prod.nome || 'Sem nome'}</h3>
                <p class="card-desc">${prod.descricao || 'Sem descrição'}</p>
                <div class="card-price-container">
                    <span class="price">${price}</span>
                </div>
            </div>
        `;
        
        elements.productsGrid.appendChild(card);
    });
}

/**
 * Abre o modal de produto.
 * @param {Object} product 
 */
function openProductModal(product) {
    document.getElementById('modal-main-img').src = getProductImageUrl(product.fotoUrl);
    document.getElementById('modal-company-badge').textContent = companiesMap[product.empresaId] || 'Parceiro';
    document.getElementById('modal-title').textContent = product.nome || 'Sem nome';
    document.getElementById('modal-code').textContent = `Código: ${product.codigo || 'N/A'}`;
    document.getElementById('modal-price').textContent = formatPrice(product.precoVenda || 0);
    document.getElementById('modal-desc').textContent = product.descricao || 'Nenhuma descrição disponível.';
    
    elements.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // block scroll
}

/**
 * Fecha o modal de produto.
 */
function closeProductModal() {
    elements.modal.classList.add('hidden');
    document.body.style.overflow = '';
}

/**
 * Helper: Formata valor para R$ X.XXX,XX
 */
function formatPrice(value) {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Helper: Retorna URL de imagem ou placeholder
 */
function getProductImageUrl(url) {
    return url ? url : 'https://via.placeholder.com/600x400?text=Sem+Imagem';
}

function showLoading(show) {
    if (show) {
        elements.loadingSpinner.classList.remove('hidden');
    } else {
        elements.loadingSpinner.classList.add('hidden');
    }
}

function showEmptyState(show) {
    if (show) {
        elements.emptyState.classList.remove('hidden');
    } else {
        elements.emptyState.classList.add('hidden');
    }
}
