import {
    registerMwa,
    createDefaultAuthorizationCache,
    createDefaultChainSelector,
    createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-standard-mobile';
import { getWallets } from '@wallet-standard/app';
import { SOLANA_MAINNET_CHAIN } from '@solana/wallet-standard-chains';

const logEl = document.getElementById('log');

function log(msg, cls = '') {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = `[${new Date().toISOString().slice(11,23)}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    console.log(`[MWA-TEST] ${msg}`);
}

// ── Environment checks ──
log('=== Environment ===', 'info');
log(`UA: ${navigator.userAgent}`);
log(`isSecureContext: ${window.isSecureContext}`);
log(`protocol: ${location.protocol}`);
log(`hostname: ${location.hostname}`);

const isWV = /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i.test(navigator.userAgent);
log(`isWebView (regex): ${isWV}`, isWV ? 'error' : 'success');

const isAndroid = /android/i.test(navigator.userAgent);
log(`isAndroid: ${isAndroid}`, isAndroid ? 'success' : 'error');

const localSupported = typeof window !== 'undefined' && window.isSecureContext && typeof document !== 'undefined' && isAndroid;
log(`getIsLocalAssociationSupported: ${localSupported}`, localSupported ? 'success' : 'error');

const shouldRegister = localSupported && !isWV;
log(`Should register MWA: ${shouldRegister}`, shouldRegister ? 'success' : 'error');

// ── Button: Register MWA ──
document.getElementById('btn-register').addEventListener('click', () => {
    log('');
    log('=== Calling registerMwa() with full config ===', 'info');
    try {
        registerMwa({
            authorizationCache: createDefaultAuthorizationCache(),
            chainSelector: createDefaultChainSelector(),
            chains: [SOLANA_MAINNET_CHAIN],
            onWalletNotFound: createDefaultWalletNotFoundHandler(),
            appIdentity: {
                uri: window.location.href,
            },
        });
        log('registerMwa() returned (no throw)', 'success');

        // Check wallet-standard state
        const { get } = getWallets();
        const wallets = get();
        log(`Registered wallets: ${wallets.length}`, wallets.length > 0 ? 'success' : 'error');
        wallets.forEach((w, i) => {
            log(`  [${i}] name="${w.name}" version="${w.version}"`, 'success');
            log(`       chains=${JSON.stringify(w.chains)}`, 'info');
            log(`       features=${JSON.stringify(Object.keys(w.features))}`, 'info');
        });
    } catch (e) {
        log(`registerMwa() threw: ${e.message}`, 'error');
        log(`stack: ${e.stack}`, 'error');
    }
});

// ── Button: Connect Wallet ──
document.getElementById('btn-connect').addEventListener('click', async () => {
    log('');
    log('=== Connect Wallet ===', 'info');
    try {
        const { get } = getWallets();
        const wallets = get();
        log(`Found ${wallets.length} wallet(s)`);

        if (wallets.length === 0) {
            log('No wallets registered! Click "Register MWA" first.', 'error');
            return;
        }

        const wallet = wallets[0];
        log(`Connecting to: ${wallet.name}`);
        log(`Features: ${JSON.stringify(Object.keys(wallet.features))}`);

        const connectFeature = wallet.features['standard:connect'];
        if (connectFeature) {
            log('Calling standard:connect...');
            try {
                const result = await connectFeature.connect();
                log(`Connect result: ${JSON.stringify(result)}`, 'success');
                if (result && result.accounts) {
                    result.accounts.forEach((acc, i) => {
                        log(`  Account[${i}]: ${acc.address}`, 'success');
                    });
                }
            } catch (connectErr) {
                log(`Connect failed: ${connectErr.message}`, 'error');
                log(`Error name: ${connectErr.name}`, 'error');
                if (connectErr.code) log(`Error code: ${connectErr.code}`, 'error');
                if (connectErr.stack) log(`Stack: ${connectErr.stack}`, 'error');
            }
        } else {
            log('No standard:connect feature available!', 'error');
        }
    } catch (e) {
        log(`Outer error: ${e.message}`, 'error');
        if (e.stack) log(`Stack: ${e.stack}`, 'error');
    }
});

// ── Button: Check State ──
document.getElementById('btn-check').addEventListener('click', () => {
    log('');
    log('=== State Check ===', 'info');
    const { get } = getWallets();
    const wallets = get();
    log(`Wallets: ${wallets.length}`);
    wallets.forEach((w, i) => {
        log(`  [${i}] ${w.name} v${w.version}`, 'success');
        log(`    accounts: ${w.accounts.length}`, w.accounts.length > 0 ? 'success' : 'info');
        w.accounts.forEach((acc, j) => {
            log(`      [${j}] ${acc.address}`, 'success');
        });
    });
});

// ── Auto-run: Listen for wallet-standard events ──
try {
    const { get, on } = getWallets();
    log('');
    log(`getWallets() called - initial count: ${get().length}`, 'info');

    on('register', (...newWallets) => {
        log(`[EVENT] Wallet(s) registered: ${newWallets.map(w => w.name).join(', ')}`, 'success');
    });
    on('unregister', (...removedWallets) => {
        log(`[EVENT] Wallet(s) unregistered: ${removedWallets.map(w => w.name).join(', ')}`, 'error');
    });
} catch(e) {
    log(`getWallets() error: ${e.message}`, 'error');
}

log('');
log('Ready. Click "1. Register MWA" to test.', 'info');
