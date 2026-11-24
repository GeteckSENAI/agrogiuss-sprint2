// =============================================================================
// Script Global da Loja Agro Giuss
// Carrinho rápido, Contador no Menu, Toast Flutuante e Menu Hambúrguer Lateral
// =============================================================================

(function () {
    function getCart() {
        try {
            return JSON.parse(localStorage.getItem('agrogiuss_cart') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem('agrogiuss_cart', JSON.stringify(cart));
        atualizarContadorMenu();
    }

    function atualizarContadorMenu() {
        const cart = getCart();
        const totalItens = cart.reduce((acc, item) => acc + (Number(item.quantidade) || 1), 0);

        document.querySelectorAll('a[href="/pedidos"]').forEach(link => {
            let badge = link.querySelector('.cart-count-badge');
            if (totalItens > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'cart-count-badge';
                    badge.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;background:#14532d;color:#fff;font-size:11px;font-weight:700;min-width:20px;height:20px;padding:0 6px;border-radius:999px;margin-left:6px;';
                    link.appendChild(badge);
                }
                badge.textContent = totalItens;
            } else if (badge) {
                badge.remove();
            }
        });
    }

    function mostrarToastCarrinho(nomeProduto) {
        let toast = document.getElementById('agroToastCart');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'agroToastCart';
            toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#14532d;color:#ffffff;padding:14px 20px;border-radius:12px;box-shadow:0 12px 28px rgba(0,0,0,0.22);display:flex;align-items:center;gap:14px;z-index:9999;font-family:Inter,sans-serif;font-size:13.5px;transition:opacity 0.25s,transform 0.25s;opacity:0;transform:translateY(12px);';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <span style="display:inline-flex;width:24px;height:24px;border-radius:50%;background:#38b049;align-items:center;justify-content:center;font-weight:800;">&#10003;</span>
            <div>
                <strong style="display:block;font-size:13.5px;">Adicionado ao carrinho!</strong>
                <span style="font-size:12px;opacity:0.88;">${nomeProduto}</span>
            </div>
            <a href="/pedidos" style="background:#ffffff;color:#14532d;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;margin-left:6px;">Ver carrinho &rarr;</a>
        `;
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        clearTimeout(window._agroToastTimer);
        window._agroToastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
        }, 4000);
    }

    window.adicionarAoCarrinhoBtn = function (btn) {
        const id = Number(btn.getAttribute('data-id'));
        const nome = btn.getAttribute('data-nome') || 'Produto';
        const preco = Number(btn.getAttribute('data-preco')) || 0;
        const imagem = btn.getAttribute('data-imagem') || '/img/logo.png';

        const cart = getCart();
        const existente = cart.find(i => Number(i.id_produto) === id);
        if (existente) {
            existente.quantidade += 1;
        } else {
            cart.push({
                id_produto: id,
                nome: nome,
                preco: preco,
                imagem: imagem,
                quantidade: 1
            });
        }
        saveCart(cart);
        mostrarToastCarrinho(nome);
    };

    function inicializarMenuHamburguer() {
        const botoes = document.querySelectorAll('.menu-hamburger-btn');
        if (!botoes.length) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'agroDrawerBackdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:9990;display:none;justify-content:flex-end;';
        backdrop.innerHTML = `
            <aside style="width:310px;max-width:86vw;background:#ffffff;height:100%;padding:24px 22px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:-8px 0 28px rgba(0,0,0,0.15);font-family:Inter,sans-serif;">
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:16px;border-bottom:1px solid #e5e7eb;margin-bottom:18px;">
                        <img src="/img/logo.png" alt="Agro Giuss" style="height:34px;">
                        <button type="button" id="fecharDrawerBtn" style="background:none;border:none;font-size:24px;cursor:pointer;color:#52525b;">&times;</button>
                    </div>
                    <p style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;margin-bottom:10px;">Navegação Principal</p>
                    <nav style="display:flex;flex-direction:column;gap:8px;">
                        <a href="/" style="padding:11px 14px;border-radius:10px;background:#f4f9f5;color:#14532d;font-weight:700;font-size:14px;text-decoration:none;">Início (Landing Page)</a>
                        <a href="/catalogo" style="padding:11px 14px;border-radius:10px;border:1px solid #e5e7eb;color:#18181b;font-weight:600;font-size:14px;text-decoration:none;">Catálogo de Produtos</a>
                        <a href="/catalogo?ordem=menor-preco" style="padding:11px 14px;border-radius:10px;border:1px solid #e5e7eb;color:#18181b;font-weight:600;font-size:14px;text-decoration:none;">Ofertas e Menores Preços</a>
                        <a href="/pedidos" style="padding:11px 14px;border-radius:10px;border:1px solid #e5e7eb;color:#18181b;font-weight:600;font-size:14px;text-decoration:none;display:flex;align-items:center;justify-content:space-between;">Meus Pedidos / Carrinho</a>
                    </nav>

                    <p style="font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;margin:22px 0 10px;">Acesso e Gestão</p>
                    <nav style="display:flex;flex-direction:column;gap:8px;">
                        <a href="/login" style="padding:11px 14px;border-radius:10px;border:1px solid #e5e7eb;color:#18181b;font-weight:600;font-size:14px;text-decoration:none;">Login / Criar Conta Cliente</a>
                        <a href="/admin" style="padding:11px 14px;border-radius:10px;background:#38b049;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;text-align:center;">Painel Administrativo &rarr;</a>
                    </nav>
                </div>
                <div style="font-size:12px;color:#71717a;border-top:1px solid #e5e7eb;padding-top:14px;">
                    <strong>Agro Giuss</strong> &bull; Mirandópolis - SP
                </div>
            </aside>
        `;
        document.body.appendChild(backdrop);

        botoes.forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                atualizarContadorMenu();
                backdrop.style.display = 'flex';
            });
        });

        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop || e.target.id === 'fecharDrawerBtn') {
                backdrop.style.display = 'none';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        atualizarContadorMenu();
        inicializarMenuHamburguer();
    });
})();
