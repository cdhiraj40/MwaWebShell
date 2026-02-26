package com.solanamobile.webshell

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.net.toUri
import com.solanamobile.webshell.ui.theme.MwaWebShellTheme
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        setContent {
            MwaWebShellTheme {
                MwaWebShellScreen()
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MwaWebShellScreen() {
    val context = LocalContext.current
    val debugState =
        rememberWebShellDebugState(
            context = context,
            defaultUrl = BuildConfig.WEB_SHELL_URL,
            isDebugBuild = BuildConfig.DEBUG,
        )

    var progress by remember { mutableFloatStateOf(0f) }
    var isLoading by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }
    var showSplash by remember { mutableStateOf(true) }
    var isMwaInjectionEnabled by remember { mutableStateOf(false) }

    val webView =
        remember {
            WebView(context).apply {
                layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.databaseEnabled = true
                settings.loadWithOverviewMode = false
                settings.useWideViewPort = false
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                settings.builtInZoomControls = true
                settings.displayZoomControls = false
                settings.setSupportZoom(true)
                settings.javaScriptCanOpenWindowsAutomatically = true
                settings.setSupportMultipleWindows(true)
                settings.offscreenPreRaster = true

                val originalUa = settings.userAgentString
                val cleanUa =
                    originalUa
                        .replace("; wv", "")
                        .replace("Version/4.0 ", "")
                        .replace("WebView", "")
                settings.userAgentString =
                    appendUserAgentMarker(
                        baseUserAgent = cleanUa,
                        userAgentMarker = BuildConfig.WEB_SHELL_USER_AGENT_SUFFIX,
                    )

                if (BuildConfig.DEBUG) {
                    Log.i(TAG, "UA original: $originalUa")
                    Log.i(TAG, "UA clean:    $cleanUa")
                    Log.i(TAG, "UA verify:   ${settings.userAgentString}")
                }

                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                webChromeClient =
                    MwaWebChromeClient(
                        onProgressChanged = { newProgress ->
                            progress = newProgress / 100f
                            if (newProgress > 0) showSplash = false
                            isLoading = newProgress < 100
                        },
                        isDebug = BuildConfig.DEBUG,
                    )

                webViewClient =
                    object : MwaWebViewClient(context, scopeHostProvider = {
                        debugState.currentUrl
                            .toUri()
                            .host
                            .orEmpty()
                    }) {
                        override fun onPageFinished(
                            view: WebView,
                            url: String?,
                        ) {
                            super.onPageFinished(view, url)
                            hasError = false
                            probeViewportAndMaybePatch(view, BuildConfig.DEBUG)
                            if (isMwaInjectionEnabled) {
                                injectMwaRegistration(view, BuildConfig.DEBUG)
                            } else if (BuildConfig.DEBUG) {
                                Log.i(TAG, "[MWA] manual registerMwa injection disabled")
                            }
                        }

                        override fun onReceivedError(
                            view: WebView,
                            errorCode: Int,
                            description: String?,
                            failingUrl: String?,
                        ) {
                            super.onReceivedError(view, errorCode, description, failingUrl)
                            if (failingUrl == view.url) {
                                hasError = true
                            }
                        }
                    }

                loadUrl(debugState.currentUrl)
            }
        }
    val loadUrlInWebView: (String) -> Unit = { rawUrl ->
        val nextUrl = debugState.loadUrl(rawUrl)
        hasError = false
        isLoading = true
        if (webView.url == nextUrl) {
            webView.reload()
        } else {
            webView.loadUrl(nextUrl)
        }
    }
    val debugUrlOptions =
        remember(debugState.currentUrl) {
            linkedSetOf(
                debugState.currentUrl,
                BuildConfig.WEB_SHELL_URL,
                *parseDebugUrlPresets(BuildConfig.WEB_SHELL_DEBUG_URL_PRESETS).toTypedArray(),
            ).toList()
        }

    DisposableEffect(Unit) {
        onDispose {
            webView.destroy()
        }
    }

    BackHandler(enabled = webView.canGoBack()) {
        webView.goBack()
    }

    Box(
        modifier =
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .windowInsetsPadding(WindowInsets.systemBars),
    ) {
        if (debugState.isDebugUrlBarVisible) {
            Column(modifier = Modifier.fillMaxSize()) {
                DebugUrlDropdownBar(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp, start = 8.dp, end = 8.dp),
                    selectedUrl = debugState.currentUrl,
                    options = debugUrlOptions,
                    onSelect = { selected -> loadUrlInWebView(selected) },
                    onReload = { loadUrlInWebView(debugState.currentUrl) },
                    isMwaInjectionEnabled = isMwaInjectionEnabled,
                    onToggleMwaInjection = {
                        isMwaInjectionEnabled = !isMwaInjectionEnabled
                    },
                )
                WebViewLayer(
                    modifier = Modifier.weight(1f),
                    webView = webView,
                    isLoading = isLoading,
                    progress = progress,
                    hasError = hasError,
                    showSplash = showSplash,
                    onRetry = { loadUrlInWebView(debugState.currentUrl) },
                )
            }
        } else {
            WebViewLayer(
                modifier = Modifier.fillMaxSize(),
                webView = webView,
                isLoading = isLoading,
                progress = progress,
                hasError = hasError,
                showSplash = showSplash,
                onRetry = { loadUrlInWebView(debugState.currentUrl) },
            )
        }
    }
}

@Composable
private fun WebViewLayer(
    modifier: Modifier,
    webView: WebView,
    isLoading: Boolean,
    progress: Float,
    hasError: Boolean,
    showSplash: Boolean,
    onRetry: () -> Unit,
) {
    Box(modifier = modifier) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { webView },
            update = { view ->
                view.layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
            },
        )

        if (isLoading && !hasError) {
            LinearProgressIndicator(
                progress = { progress },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
            )
        }

        if (hasError) {
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background.copy(alpha = 0.96f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Unable to load page",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onRetry) {
                        Text("Retry")
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showSplash,
            exit = fadeOut(),
        ) {
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
        }
    }
}

@Composable
private fun DebugUrlDropdownBar(
    modifier: Modifier = Modifier,
    selectedUrl: String,
    options: List<String>,
    onSelect: (String) -> Unit,
    onReload: () -> Unit,
    isMwaInjectionEnabled: Boolean,
    onToggleMwaInjection: () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Surface(
        modifier = modifier,
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        tonalElevation = 2.dp,
        shadowElevation = 2.dp,
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.weight(1f)) {
                Button(
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { expanded = true },
                ) {
                    Text(
                        text = selectedUrl,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                ) {
                    options.forEach { option ->
                        DropdownMenuItem(
                            text = { Text(option) },
                            onClick = {
                                expanded = false
                                onSelect(option)
                            },
                        )
                    }
                }
            }
            Button(onClick = onReload) {
                Text("Reload")
            }
            Button(onClick = onToggleMwaInjection) {
                Text(if (isMwaInjectionEnabled) "MWA: ON" else "MWA: OFF")
            }
        }
    }
}

private fun probeViewportAndMaybePatch(
    webView: WebView,
    isDebug: Boolean,
) {
    webView.evaluateJavascript(VIEWPORT_PROBE_AND_PATCH_SCRIPT) { rawResult ->
        val decoded = decodeJavascriptStringResult(rawResult)
        val parsed = runCatching { JSONObject(decoded) }.getOrNull()
        val isBroken = parsed?.optBoolean("broken") == true
        if (isDebug || isBroken) {
            Log.i(TAG, "[VP] ${parsed?.toString() ?: decoded}")
        }
    }
}

private fun injectMwaRegistration(
    webView: WebView,
    isDebug: Boolean,
) {
    webView.evaluateJavascript(MWA_REGISTER_SCRIPT) { rawResult ->
        if (isDebug) {
            Log.i(TAG, "[MWA] injection=${decodeJavascriptStringResult(rawResult)}")
        }
    }
}

private fun decodeJavascriptStringResult(rawResult: String?): String {
    if (rawResult.isNullOrBlank() || rawResult == "null") return ""
    return runCatching { JSONObject("{\"value\":$rawResult}").getString("value") }
        .getOrDefault(rawResult)
}

private fun appendUserAgentMarker(
    baseUserAgent: String,
    userAgentMarker: String,
): String {
    val marker = userAgentMarker.trim()
    if (marker.isEmpty()) return baseUserAgent.trim()
    return if (baseUserAgent.contains(marker)) {
        baseUserAgent.trim()
    } else {
        "${baseUserAgent.trim()} $marker".trim()
    }
}

private fun parseDebugUrlPresets(rawValue: String): List<String> =
    rawValue
        .split(',', '\n')
        .mapNotNull(::normalizeHttpUrl)
        .distinct()

private fun normalizeHttpUrl(rawValue: String): String? {
    val trimmed = rawValue.trim()
    if (trimmed.isEmpty()) return null
    val withScheme =
        if ("://" in trimmed) {
            trimmed
        } else {
            "https://$trimmed"
        }
    val uri = withScheme.toUri()
    val scheme = uri.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return null
    if (uri.host.isNullOrBlank()) return null
    return uri.toString()
}

private const val TAG = "MwaWebShell"

private val VIEWPORT_PROBE_AND_PATCH_SCRIPT =
    """
    (function () {
      function measureViewport() {
        var probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;';
        document.documentElement.appendChild(probe);
        probe.style.height = '100vh';
        var vh = probe.getBoundingClientRect().height;
        probe.style.height = '100dvh';
        var dvh = probe.getBoundingClientRect().height;
        document.documentElement.removeChild(probe);
        return {
          innerHeight: window.innerHeight || 0,
          visualViewportHeight: window.visualViewport ? window.visualViewport.height : 0,
          vh: vh,
          dvh: dvh
        };
      }

      function updateViewportVars() {
        var px = Math.max(window.innerHeight || 0, 1) + 'px';
        document.documentElement.style.setProperty('--mwa-vh-px', px);
        document.documentElement.style.setProperty('--mwa-dvh-px', px);
      }

      function applyFallbackPatch() {
        updateViewportVars();
        if (!window.__mwa_viewport_resize_hook__) {
          window.__mwa_viewport_resize_hook__ = true;
          window.addEventListener('resize', updateViewportVars);
          window.addEventListener('orientationchange', updateViewportVars);
          if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateViewportVars);
          }
        }

        var style = document.getElementById('__mwa_viewport_patch_style__');
        if (!style) {
          style = document.createElement('style');
          style.id = '__mwa_viewport_patch_style__';
          style.textContent = [
            ':root { --mwa-vh-px: 100vh; --mwa-dvh-px: 100vh; }',
            'html, body, #root, #app { min-height: var(--mwa-dvh-px) !important; height: auto !important; }',
            '[class~="h-screen"], [class~="h-dvh"], [class*="h-screen"], [class*="h-dvh"] { height: var(--mwa-dvh-px) !important; }',
            '[class~="min-h-screen"], [class~="min-h-dvh"], [class*="min-h-screen"], [class*="min-h-dvh"] { min-height: var(--mwa-dvh-px) !important; }',
            '[class~="max-h-screen"], [class~="max-h-dvh"], [class*="max-h-screen"], [class*="max-h-dvh"] { max-height: var(--mwa-dvh-px) !important; }'
          ].join('\n');
          document.documentElement.appendChild(style);
        }

        var classElements = document.querySelectorAll('[class]');
        for (var i = 0; i < classElements.length; i++) {
          var className = classElements[i].className;
          if (typeof className !== 'string') continue;
          if (className.indexOf('max-h-[calc(100dvh-1rem)]') !== -1 || className.indexOf('max-h-[calc(100vh-1rem)]') !== -1) {
            classElements[i].style.maxHeight = 'calc(var(--mwa-dvh-px) - 1rem)';
          }
        }
      }

      var before = measureViewport();
      var broken = before.innerHeight > 0 && (before.vh <= 1 || before.dvh <= 1);
      if (broken) {
        applyFallbackPatch();
      }
      var after = measureViewport();
      return JSON.stringify({
        broken: broken,
        patched: broken,
        before: before,
        after: after
      });
    })();
    """.trimIndent()

private val MWA_REGISTER_SCRIPT =
    """
    (function() {
      if (window.__mwa_injected__) return "already";
      window.__mwa_injected__ = true;

      var script = document.createElement('script');
      script.type = 'module';
      script.textContent = "\
        import { registerMwa, createDefaultAuthorizationCache, createDefaultChainSelector, createDefaultWalletNotFoundHandler } from 'https://esm.sh/@solana-mobile/wallet-standard-mobile@0.4.4';\
        registerMwa({\
          authorizationCache: createDefaultAuthorizationCache(),\
          chainSelector: createDefaultChainSelector(),\
          chains: ['solana:mainnet'],\
          onWalletNotFound: createDefaultWalletNotFoundHandler(),\
          appIdentity: { uri: window.location.href },\
        });\
        console.log('[MWA] registerMwa() injected successfully');\
      ";
      document.head.appendChild(script);
      return "injected";
    })();
    """.trimIndent()
