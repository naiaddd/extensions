document.addEventListener('DOMContentLoaded', async () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchEngineSelect = document.getElementById('search-engine-select');
    const bookmarksGrid = document.getElementById('bookmarks-grid');
    const loader = document.getElementById('loader');
    const managementPanel = document.getElementById('management-panel');
    const addShortcutForm = document.getElementById('add-shortcut-form');

    const ENGINES = {
        'duckduckgo': 'https://duckduckgo.com/?q=',
        'google': 'https://www.google.com/search?q='
    };

    const FALLBACK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];
    let isManagementOpen = false;

    // Direct interface closer routine
    const closeManagementPanel = () => {
        isManagementOpen = false;
        managementPanel.style.display = 'none';
        document.body.classList.remove('delete-mode');
        searchInput.focus(); // Snap focus back to primary search bar
    };

    // Keyboard interaction routing (Ctrl+M to toggle, Escape to close)
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            isManagementOpen = !isManagementOpen;
            
            if (isManagementOpen) {
                managementPanel.style.display = 'flex';
                document.body.classList.add('delete-mode');
                document.getElementById('new-site-name').focus();
            } else {
                closeManagementPanel();
            }
        } else if (e.key === 'Escape' && isManagementOpen) {
            e.preventDefault();
            closeManagementPanel();
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = encodeURIComponent(searchInput.value.trim());
        if (query) {
            window.location.href = `${ENGINES[searchEngineSelect.value]}${query}`;
        }
    });

    const extractDomain = (urlStr) => {
        try { return new URL(urlStr).hostname.replace(/^www\./, ''); } 
        catch (e) { return urlStr; }
    };

    const getFallbackColor = (letter) => {
        const index = letter.charCodeAt(0) % FALLBACK_COLORS.length;
        return FALLBACK_COLORS[index];
    };

    const renderGrid = (links) => {
        bookmarksGrid.innerHTML = '';
        if (!links || !Array.isArray(links)) return;

        links.forEach((link, index) => {
            const card = document.createElement('a');
            card.className = 'bookmark-card';
            card.href = link.url;
            card.style.animation = `slide-up-fade 0.4s ease-out ${0.02 * index}s forwards`;
            
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'bookmark-icon-wrapper';
            
            const domain = extractDomain(link.url);
            const firstLetter = (link.name || domain).charAt(0).toUpperCase();

            const apiUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            const img = document.createElement('img');
            img.className = 'bookmark-icon';
            img.src = link.icon ? link.icon : apiUrl;
            
            img.onerror = () => {
                // If local icon failed, try the API. If API fails, use fallback letter.
                if (img.src !== apiUrl) {
                    img.src = apiUrl;
                } else {
                    iconWrapper.innerHTML = '';
                    iconWrapper.style.backgroundColor = getFallbackColor(firstLetter);
                    const fallbackText = document.createElement('span');
                    fallbackText.className = 'bookmark-fallback';
                    fallbackText.textContent = firstLetter;
                    iconWrapper.appendChild(fallbackText);
                }
            };
            iconWrapper.appendChild(img);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'bookmark-name';
            nameSpan.textContent = link.name;

            card.appendChild(iconWrapper);
            card.appendChild(nameSpan);

            card.addEventListener('click', async (e) => {
                if (isManagementOpen) {
                    e.preventDefault(); 
                    
                    const storage = await chrome.storage.local.get(['links']);
                    let currentLinks = storage.links || [];
                    
                    currentLinks.splice(index, 1);
                    await chrome.storage.local.set({ links: currentLinks });
                    
                    renderGrid(currentLinks);
                }
            });

            bookmarksGrid.appendChild(card);
        });
    };

    addShortcutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('new-site-name');
        const urlInput = document.getElementById('new-site-url');
        
        let name = nameInput.value.trim();
        let url = urlInput.value.trim();

        if (!name || !url) return;
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        const data = await chrome.storage.local.get(['links']);
        const currentLinks = data.links || [];
        
        currentLinks.push({ name, url, icon: "" }); // Leave icon blank to trigger API fallback
        await chrome.storage.local.set({ links: currentLinks });

        nameInput.value = '';
        urlInput.value = '';
        nameInput.focus();
        
        renderGrid(currentLinks);
    });

    const init = async () => {
        try {
            let storage = await chrome.storage.local.get(['links', 'search_engine']);
            
            if (!storage.links) {
                const response = await fetch('config.json');
                const config = await response.json();
                await chrome.storage.local.set({
                    links: config.links,
                    search_engine: config.search_engine || 'duckduckgo'
                });
                storage = { links: config.links, search_engine: config.search_engine || 'duckduckgo' };
            }

            if (storage.search_engine && ENGINES[storage.search_engine]) {
                searchEngineSelect.value = storage.search_engine;
            }

            loader.style.display = 'none';
            renderGrid(storage.links);
            
        } catch (error) {
            console.error(error);
            loader.className = 'error-message';
            loader.innerHTML = `<span>Error synchronizing local storage engine.</span>`;
        }
        searchInput.focus();
    };

    init();
});
